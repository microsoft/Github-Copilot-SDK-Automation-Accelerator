"""
EPUB Processor — adapted from Karpathy's reader3.py
Parses an EPUB file, extracts chapters as plain-text .txt files,
and writes metadata.json into data/<book-slug>/.
"""

import json
import os
import re
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from urllib.parse import unquote

import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup, Comment


# ---------------------------------------------------------------------------
# Data structures (mirrors reader3.py)
# ---------------------------------------------------------------------------

@dataclass
class TOCEntry:
    title: str
    href: str
    file_href: str
    anchor: str = ""
    children: List["TOCEntry"] = field(default_factory=list)


@dataclass
class BookMetadata:
    title: str
    language: str
    authors: List[str] = field(default_factory=list)
    description: Optional[str] = None
    publisher: Optional[str] = None
    date: Optional[str] = None
    subjects: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Utilities (from reader3.py)
# ---------------------------------------------------------------------------

def clean_html_content(soup: BeautifulSoup) -> BeautifulSoup:
    """Remove scripts, styles, forms, and other non-content elements."""
    for tag in soup(["script", "style", "iframe", "video", "nav", "form", "button"]):
        tag.decompose()
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()
    for tag in soup.find_all("input"):
        tag.decompose()
    return soup


def extract_plain_text(soup: BeautifulSoup) -> str:
    """Extract clean text for reading / LLM context."""
    text = soup.get_text(separator=" ")
    return " ".join(text.split())


def parse_toc_recursive(toc_list, depth=0) -> List[TOCEntry]:
    """Recursively parse the TOC structure from ebooklib."""
    result: List[TOCEntry] = []
    for item in toc_list:
        if isinstance(item, tuple):
            section, children = item
            entry = TOCEntry(
                title=section.title,
                href=section.href,
                file_href=section.href.split("#")[0],
                anchor=section.href.split("#")[1] if "#" in section.href else "",
                children=parse_toc_recursive(children, depth + 1),
            )
            result.append(entry)
        elif isinstance(item, epub.Link):
            result.append(TOCEntry(
                title=item.title,
                href=item.href,
                file_href=item.href.split("#")[0],
                anchor=item.href.split("#")[1] if "#" in item.href else "",
            ))
        elif isinstance(item, epub.Section):
            result.append(TOCEntry(
                title=item.title,
                href=item.href if item.href else "",
                file_href=(item.href.split("#")[0]) if item.href else "",
                anchor=(item.href.split("#")[1] if item.href and "#" in item.href else ""),
            ))
    return result


def get_fallback_toc(book_obj) -> List[TOCEntry]:
    """If the real TOC is empty, build one from the spine."""
    toc: List[TOCEntry] = []
    for item in book_obj.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            name = item.get_name()
            title = (
                name.replace(".html", "")
                .replace(".xhtml", "")
                .replace("_", " ")
                .title()
            )
            toc.append(TOCEntry(title=title, href=name, file_href=name))
    return toc


def extract_metadata(book_obj) -> BookMetadata:
    """Extract DC metadata from the EPUB."""
    def _list(key):
        data = book_obj.get_metadata("DC", key)
        return [x[0] for x in data] if data else []

    def _one(key):
        data = book_obj.get_metadata("DC", key)
        return data[0][0] if data else None

    return BookMetadata(
        title=_one("title") or "Untitled",
        language=_one("language") or "en",
        authors=_list("creator"),
        description=_one("description"),
        publisher=_one("publisher"),
        date=_one("date"),
        subjects=_list("subject"),
    )


# ---------------------------------------------------------------------------
# Slug helpers
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    """Turn a title into a filesystem-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:80].strip("-") or "untitled"


# ---------------------------------------------------------------------------
# Flatten TOC into ordered list of (file_href → title)
# ---------------------------------------------------------------------------

def _flatten_toc(entries: List[TOCEntry]) -> List[TOCEntry]:
    flat: List[TOCEntry] = []
    for e in entries:
        flat.append(e)
        if e.children:
            flat.extend(_flatten_toc(e.children))
    return flat


def _build_href_title_map(toc_entries: List[TOCEntry]) -> dict:
    """Map file_href → first TOC title that references it."""
    mapping: dict = {}
    for entry in _flatten_toc(toc_entries):
        fh = unquote(entry.file_href)
        if fh and fh not in mapping:
            mapping[fh] = entry.title
    return mapping


# ---------------------------------------------------------------------------
# Main processing
# ---------------------------------------------------------------------------

def process_epub(epub_path: str, data_dir: str) -> dict:
    """
    Process an EPUB file:
    1. Parse with ebooklib
    2. Extract chapter plain text
    3. Write each chapter as a numbered .txt file
    4. Write metadata.json

    Returns a dict with book_id, metadata, and chapter list.
    """
    book = epub.read_epub(epub_path)
    metadata = extract_metadata(book)

    # Build a slug-based book id
    book_slug = slugify(metadata.title)
    book_dir = os.path.join(data_dir, book_slug)

    # If the folder already exists, append a timestamp to avoid collisions
    if os.path.exists(book_dir):
        book_slug = f"{book_slug}-{int(datetime.now().timestamp())}"
        book_dir = os.path.join(data_dir, book_slug)

    os.makedirs(book_dir, exist_ok=True)

    # Parse TOC
    toc_entries = parse_toc_recursive(book.toc)
    if not toc_entries:
        toc_entries = get_fallback_toc(book)

    href_title_map = _build_href_title_map(toc_entries)

    # Process spine chapters
    chapters_info: list = []
    for idx, spine_item in enumerate(book.spine):
        item_id, _linear = spine_item
        item = book.get_item_with_id(item_id)
        if not item or item.get_type() != ebooklib.ITEM_DOCUMENT:
            continue

        raw = item.get_content().decode("utf-8", errors="ignore")
        soup = BeautifulSoup(raw, "html.parser")
        soup = clean_html_content(soup)
        plain_text = extract_plain_text(soup)

        # Skip near-empty chapters (< 20 chars of real content)
        if len(plain_text.strip()) < 20:
            continue

        # Determine chapter title from TOC mapping
        item_href = unquote(item.get_name())
        chapter_title = href_title_map.get(item_href, f"Section {idx + 1}")

        # Build filename: 01-chapter-title.txt
        chapter_num = len(chapters_info) + 1
        filename = f"{chapter_num:02d}-{slugify(chapter_title)}.txt"

        # Write chapter text file
        filepath = os.path.join(book_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(plain_text)

        chapters_info.append({
            "filename": filename,
            "title": chapter_title,
            "order": chapter_num,
            "char_count": len(plain_text),
        })

    # Write metadata.json
    meta_dict = {
        "book_id": book_slug,
        "title": metadata.title,
        "authors": metadata.authors,
        "language": metadata.language,
        "description": metadata.description,
        "publisher": metadata.publisher,
        "date": metadata.date,
        "subjects": metadata.subjects,
        "chapters": chapters_info,
        "processed_at": datetime.now().isoformat(),
    }
    with open(os.path.join(book_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta_dict, f, indent=2, ensure_ascii=False)

    return meta_dict


def delete_book(book_id: str, data_dir: str) -> bool:
    """Delete a book folder from the data directory."""
    book_dir = os.path.join(data_dir, book_id)
    if os.path.isdir(book_dir):
        shutil.rmtree(book_dir)
        return True
    return False


def list_books(data_dir: str) -> list:
    """List all books in the data directory by reading each metadata.json."""
    books = []
    if not os.path.isdir(data_dir):
        return books
    for name in sorted(os.listdir(data_dir)):
        meta_path = os.path.join(data_dir, name, "metadata.json")
        if os.path.isfile(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                books.append(json.load(f))
    return books


def get_book_metadata(book_id: str, data_dir: str) -> Optional[dict]:
    """Read a single book's metadata."""
    meta_path = os.path.join(data_dir, book_id, "metadata.json")
    if os.path.isfile(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def get_chapter_text(book_id: str, chapter_file: str, data_dir: str) -> Optional[str]:
    """Read a chapter's text content."""
    filepath = os.path.join(data_dir, book_id, chapter_file)
    # Security: ensure the resolved path is within the book directory
    book_dir = os.path.join(data_dir, book_id)
    resolved = os.path.realpath(filepath)
    if not resolved.startswith(os.path.realpath(book_dir)):
        return None
    if os.path.isfile(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    return None
