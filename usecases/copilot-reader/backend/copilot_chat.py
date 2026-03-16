"""
Copilot Chat Manager — wraps the GitHub Copilot SDK for book-grounded chat.
Manages CopilotClient lifecycle and per-book sessions.
Yields SSE-formatted streaming deltas including real SDK events
(tool execution start/complete, reasoning, errors).
"""

import asyncio
import os
import json
import re
from typing import AsyncGenerator, Optional

from copilot import CopilotClient
from copilot.tools import define_tool
from copilot.generated.session_events import SessionEventType
from pydantic import BaseModel, Field

from skills import get_skill
from agents import get_agent, all_agents_sdk


# ---------------------------------------------------------------------------
# Book tools (registered with the Copilot SDK via @define_tool)
# These are *real* tools that the model can choose to invoke.
# We store a module-level reference to data_dir so tools can access it.
# ---------------------------------------------------------------------------

_DATA_DIR: str = ""


class ReadChapterParams(BaseModel):
    book_id: str = Field(description="The book identifier (slug)")
    chapter_filename: str = Field(description="Filename of the chapter, e.g. '05-chapter-v.txt'")


@define_tool(description="Read the full text of a specific chapter from the book")
async def read_chapter(params: ReadChapterParams) -> dict:
    """Read a chapter file and return its text."""
    filepath = os.path.join(_DATA_DIR, params.book_id, params.chapter_filename)
    book_dir = os.path.join(_DATA_DIR, params.book_id)
    resolved = os.path.realpath(filepath)
    if not resolved.startswith(os.path.realpath(book_dir)):
        return {"error": "Invalid path"}
    if os.path.isfile(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            text = f.read(15000)  # cap at 15k chars
        return {"filename": params.chapter_filename, "text": text, "truncated": len(text) >= 15000}
    return {"error": f"Chapter '{params.chapter_filename}' not found"}


class ListChaptersParams(BaseModel):
    book_id: str = Field(description="The book identifier (slug)")


@define_tool(description="List all chapters in the book with their titles and filenames")
async def list_chapters(params: ListChaptersParams) -> dict:
    """Return the table of contents for the book."""
    meta_path = os.path.join(_DATA_DIR, params.book_id, "metadata.json")
    if os.path.isfile(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        chapters = [
            {"filename": ch["filename"], "title": ch["title"], "order": ch["order"]}
            for ch in meta.get("chapters", [])
        ]
        return {"book": meta.get("title", params.book_id), "chapters": chapters}
    return {"error": "Book not found"}


class SearchBookParams(BaseModel):
    book_id: str = Field(description="The book identifier (slug)")
    query: str = Field(description="Text to search for across all chapters (case-insensitive)")


@define_tool(description="Search for a text string across all chapters in the book")
async def search_book(params: SearchBookParams) -> dict:
    """Search all chapter files for a query string. Returns matching snippets."""
    book_dir = os.path.join(_DATA_DIR, params.book_id)
    if not os.path.isdir(book_dir):
        return {"error": "Book not found"}
    results = []
    query_lower = params.query.lower()
    for fname in sorted(os.listdir(book_dir)):
        if not fname.endswith(".txt"):
            continue
        fpath = os.path.join(book_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            text = f.read()
        idx = text.lower().find(query_lower)
        if idx != -1:
            start = max(0, idx - 80)
            end = min(len(text), idx + len(params.query) + 80)
            snippet = text[start:end]
            results.append({"chapter": fname, "snippet": f"...{snippet}..."})
        if len(results) >= 10:
            break
    return {"query": params.query, "matches": results, "total": len(results)}


# ---------------------------------------------------------------------------
# Notes tools — read/write/edit/delete notes in <book_id>_notes/ folder
# ---------------------------------------------------------------------------

def _notes_dir(book_id: str) -> str:
    """Return the path to the notes folder for a book, creating it if needed."""
    d = os.path.join(_DATA_DIR, f"{book_id}_notes")
    os.makedirs(d, exist_ok=True)
    return d


def _safe_filename(name: str) -> str:
    """Sanitise a note title into a safe filename."""
    name = re.sub(r'[^\w\s-]', '', name).strip()
    name = re.sub(r'[\s]+', '_', name)
    if not name:
        name = "untitled"
    if not name.endswith(".txt"):
        name += ".txt"
    return name


class CreateNoteParams(BaseModel):
    book_id: str = Field(description="The book identifier (slug)")
    title: str = Field(description="Title for the note (used as filename)")
    content: str = Field(description="Full text content of the note")


@define_tool(description="Create a new note for the book. Notes are stored as .txt files in the book's notes folder.")
async def create_note(params: CreateNoteParams) -> dict:
    """Create a new note file."""
    notes = _notes_dir(params.book_id)
    filename = _safe_filename(params.title)
    filepath = os.path.join(notes, filename)
    if os.path.isfile(filepath):
        return {"error": f"A note named '{filename}' already exists. Use edit_note to update it."}
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(params.content)
    return {"status": "created", "filename": filename, "path": f"{params.book_id}_notes/{filename}"}


class EditNoteParams(BaseModel):
    book_id: str = Field(description="The book identifier (slug)")
    filename: str = Field(description="Filename of the note to edit, e.g. 'my_note.txt'")
    content: str = Field(description="New full text content to replace the note's content")


@define_tool(description="Overwrite the content of an existing note for the book.")
async def edit_note(params: EditNoteParams) -> dict:
    """Edit/overwrite an existing note file."""
    notes = _notes_dir(params.book_id)
    filepath = os.path.join(notes, params.filename)
    resolved = os.path.realpath(filepath)
    if not resolved.startswith(os.path.realpath(notes)):
        return {"error": "Invalid path"}
    if not os.path.isfile(filepath):
        return {"error": f"Note '{params.filename}' not found. Use create_note first."}
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(params.content)
    return {"status": "updated", "filename": params.filename}


class AppendNoteParams(BaseModel):
    book_id: str = Field(description="The book identifier (slug)")
    filename: str = Field(description="Filename of the note to append to, e.g. 'my_note.txt'")
    content: str = Field(description="Text to append to the end of the note")


@define_tool(description="Append text to an existing note for the book.")
async def append_note(params: AppendNoteParams) -> dict:
    """Append content to an existing note file."""
    notes = _notes_dir(params.book_id)
    filepath = os.path.join(notes, params.filename)
    resolved = os.path.realpath(filepath)
    if not resolved.startswith(os.path.realpath(notes)):
        return {"error": "Invalid path"}
    if not os.path.isfile(filepath):
        return {"error": f"Note '{params.filename}' not found. Use create_note first."}
    with open(filepath, "a", encoding="utf-8") as f:
        f.write("\n" + params.content)
    return {"status": "appended", "filename": params.filename}


class ListNotesParams(BaseModel):
    book_id: str = Field(description="The book identifier (slug)")


@define_tool(description="List all notes saved for the book.")
async def list_notes(params: ListNotesParams) -> dict:
    """List all note files in the notes folder."""
    notes = _notes_dir(params.book_id)
    files = sorted(f for f in os.listdir(notes) if f.endswith(".txt"))
    return {"book_id": params.book_id, "notes": files, "total": len(files)}


class ReadNoteParams(BaseModel):
    book_id: str = Field(description="The book identifier (slug)")
    filename: str = Field(description="Filename of the note to read, e.g. 'my_note.txt'")


@define_tool(description="Read the full content of a specific note for the book.")
async def read_note(params: ReadNoteParams) -> dict:
    """Read a note file and return its text."""
    notes = _notes_dir(params.book_id)
    filepath = os.path.join(notes, params.filename)
    resolved = os.path.realpath(filepath)
    if not resolved.startswith(os.path.realpath(notes)):
        return {"error": "Invalid path"}
    if os.path.isfile(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            text = f.read()
        return {"filename": params.filename, "content": text}
    return {"error": f"Note '{params.filename}' not found"}


class DeleteNoteParams(BaseModel):
    book_id: str = Field(description="The book identifier (slug)")
    filename: str = Field(description="Filename of the note to delete, e.g. 'my_note.txt'")


@define_tool(description="Delete a specific note for the book.")
async def delete_note(params: DeleteNoteParams) -> dict:
    """Delete a note file."""
    notes = _notes_dir(params.book_id)
    filepath = os.path.join(notes, params.filename)
    resolved = os.path.realpath(filepath)
    if not resolved.startswith(os.path.realpath(notes)):
        return {"error": "Invalid path"}
    if os.path.isfile(filepath):
        os.remove(filepath)
        return {"status": "deleted", "filename": params.filename}
    return {"error": f"Note '{params.filename}' not found"}


# ---------------------------------------------------------------------------
# ChatManager
# ---------------------------------------------------------------------------

class ChatManager:
    """Manages a single CopilotClient and per-book chat sessions."""

    def __init__(self, data_dir: str):
        global _DATA_DIR
        self.data_dir = data_dir
        _DATA_DIR = data_dir
        self._client: Optional[CopilotClient] = None
        self._sessions: dict = {}  # (book_id, model) -> session
        self._lock = asyncio.Lock()
        self._token: Optional[str] = None

    @property
    def is_authenticated(self) -> bool:
        """True if a token is set and the client is running."""
        return self._client is not None

    @property
    def has_token(self) -> bool:
        return self._token is not None or os.environ.get("GITHUB_TOKEN") is not None

    async def start(self, token: Optional[str] = None):
        """Start the CopilotClient. If token is provided, set GITHUB_TOKEN env var."""
        if token:
            self._token = token
            os.environ["GITHUB_TOKEN"] = token
        elif self._token:
            os.environ["GITHUB_TOKEN"] = self._token
        self._client = CopilotClient()
        await self._client.start()

    async def stop(self):
        """Stop the CopilotClient (call on app shutdown)."""
        if self._client:
            await self._client.stop()
            self._client = None
        self._sessions.clear()

    async def restart_with_token(self, token: str):
        """Stop any existing client and restart with a new token."""
        await self.stop()
        await self.start(token=token)

    def clear_token(self):
        """Remove stored token and env var."""
        self._token = None
        os.environ.pop("GITHUB_TOKEN", None)

    def _build_system_message(self, book_id: str) -> str:
        """Build a grounding system prompt for the book (static — no chapter text)."""
        meta_path = os.path.join(self.data_dir, book_id, "metadata.json")
        title = book_id
        authors = ""

        if os.path.isfile(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            title = meta.get("title", book_id)
            authors = ", ".join(meta.get("authors", []))

        prompt = f"""You are Reader IDE — an AI reading companion for the book "{title}"{f' by {authors}' if authors else ''}.

RULES:
- You discuss this book, its themes, characters, plot, writing style, and related literary topics.
- If the user asks about something completely unrelated to this book, politely redirect them.
- Be insightful, reference specific passages when possible, and help the user understand and appreciate the text.
- Keep responses concise but thoughtful.
- You have tools to read chapters, list chapters, and search across the book. Use them when the user asks about content not in the current chapter.
- You also have note-taking tools: create_note, edit_note, append_note, list_notes, read_note, and delete_note. Use them when the user asks to take notes, save thoughts, create summaries, or manage their reading notes.
- When creating notes, choose descriptive titles. When appending, prefer append_note over edit_note to avoid overwriting.
- The book_id for this book is "{book_id}". Always pass this when calling tools.
- If the user asks to check the internet or you need to run an internet search for some information, use the internal tools to do it.
"""
        return prompt

    async def _get_or_create_session(self, book_id: str, model: str = "gpt-4.1"):
        """Reuse an existing session for the book+model, or create one if none exists."""
        session_key = (book_id, model)
        async with self._lock:
            if session_key in self._sessions:
                return self._sessions[session_key]

            system_msg = self._build_system_message(book_id)

            session = await self._client.create_session({
                "model": model,
                "streaming": True,
                "on_permission_request": lambda req, ctx: {"kind": "approved", "rules": []},
                "system_message": {
                    "content": system_msg,
                },
                "tools": [read_chapter, list_chapters, search_book,
                          create_note, edit_note, append_note, list_notes, read_note, delete_note],
                "custom_agents": all_agents_sdk(),
            })
            self._sessions[session_key] = session
            return session

    def _parse_skill(self, message: str) -> tuple[Optional[str], str]:
        """
        Detect a /skill prefix in the user message.
        Returns (skill_name_or_None, remaining_message).
        e.g. "/summary chapter 5" -> ("summary", "chapter 5")
        """
        match = re.match(r"^/(\w+)\s*(.*)", message, re.DOTALL)
        if match:
            skill_name = match.group(1).lower()
            rest = match.group(2).strip()
            skill = get_skill(skill_name)
            if skill:
                return skill_name, rest
        return None, message

    def _parse_agent(self, message: str) -> tuple[Optional[str], str]:
        """
        Detect an @agent prefix in the user message.
        Returns (agent_name_or_None, remaining_message).
        e.g. "@archivist tell me about Dracula" -> ("archivist", "tell me about Dracula")
        """
        match = re.match(r"^@(\w+)\s*(.*)", message, re.DOTALL)
        if match:
            agent_name = match.group(1).lower()
            rest = match.group(2).strip()
            agent = get_agent(agent_name)
            if agent:
                return agent_name, rest
        return None, message

    async def chat_stream(
        self,
        book_id: str,
        message: str,
        current_chapter: Optional[str] = None,
        model: str = "gpt-4.1",
    ) -> AsyncGenerator[str, None]:
        """
        Send a message and yield SSE-formatted streaming chunks.
        Forwards ALL real SDK events: deltas, tool calls, reasoning, errors.
        Each yielded string is a complete SSE event: "data: ...\\n\\n"
        """
        # Detect /skill prefix and inject the skill prompt
        skill_name, user_text = self._parse_skill(message)
        skill_obj = get_skill(skill_name) if skill_name else None

        if skill_obj:
            # Build augmented message: skill instruction + user input
            augmented = skill_obj.prompt_template
            if user_text:
                augmented += f"\n\nUser's additional context: {user_text}"
            else:
                augmented += "\n\nNo additional context provided — use the current chapter."
            message = augmented
        else:
            # Detect @agent prefix and inject the agent persona
            agent_name, agent_text = self._parse_agent(message)
            agent_obj = get_agent(agent_name) if agent_name else None

            if agent_obj:
                augmented = (
                    f"{agent_obj.prompt}\n\n"
                    f"--- USER MESSAGE ---\n"
                    f"{agent_text if agent_text else 'No specific question — analyse the current chapter.'}"
                )
                message = augmented

        # Inject current chapter text as context before the user message
        if current_chapter:
            chapter_path = os.path.join(self.data_dir, book_id, current_chapter)
            if os.path.isfile(chapter_path):
                with open(chapter_path, "r", encoding="utf-8") as f:
                    chapter_text = f.read(12000)
                chapter_preamble = (
                    f"[CURRENT CHAPTER CONTEXT — the user is reading {current_chapter}]\n"
                    f"---\n{chapter_text}\n---\n\n"
                )
                message = chapter_preamble + message

        session = await self._get_or_create_session(book_id, model)

        # Queue collects typed event dicts for SSE serialization
        queue: asyncio.Queue = asyncio.Queue()
        done_event = asyncio.Event()

        def handle_event(event):
            if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
                queue.put_nowait({"type": "delta", "content": event.data.delta_content})

            elif event.type == SessionEventType.TOOL_EXECUTION_START:
                tool_name = getattr(event.data, "tool_name", "unknown")
                arguments = getattr(event.data, "arguments", None)
                args_str = ""
                if arguments:
                    try:
                        args_str = json.dumps(arguments) if isinstance(arguments, dict) else str(arguments)
                    except Exception:
                        args_str = str(arguments)
                queue.put_nowait({
                    "type": "tool_start",
                    "tool_name": tool_name,
                    "arguments": args_str,
                })

            elif event.type == SessionEventType.TOOL_EXECUTION_COMPLETE:
                tool_name = getattr(event.data, "tool_name", "unknown")
                result = getattr(event.data, "result", None)
                result_str = ""
                if result:
                    try:
                        result_str = json.dumps(result) if isinstance(result, dict) else str(result)
                    except Exception:
                        result_str = str(result)
                queue.put_nowait({
                    "type": "tool_complete",
                    "tool_name": tool_name,
                    "result": result_str[:500],  # cap result preview
                })

            elif event.type == SessionEventType.ASSISTANT_REASONING_DELTA:
                delta = getattr(event.data, "delta_content", "")
                if delta:
                    queue.put_nowait({"type": "reasoning", "content": delta})

            elif event.type == SessionEventType.SESSION_ERROR:
                error_msg = getattr(event.data, "message", "Unknown error")
                queue.put_nowait({"type": "error", "message": error_msg})
                done_event.set()

            elif event.type == SessionEventType.SESSION_IDLE:
                done_event.set()

        session.on(handle_event)

        send_task = asyncio.create_task(
            session.send_and_wait({"prompt": message})
        )

        try:
            while not done_event.is_set() or not queue.empty():
                try:
                    evt = await asyncio.wait_for(queue.get(), timeout=0.1)
                    yield f"data: {json.dumps(evt)}\n\n"
                except asyncio.TimeoutError:
                    continue

            # Drain remaining
            while not queue.empty():
                evt = queue.get_nowait()
                yield f"data: {json.dumps(evt)}\n\n"

            yield "data: [DONE]\n\n"
        finally:
            if not send_task.done():
                send_task.cancel()
                try:
                    await send_task
                except (asyncio.CancelledError, Exception):
                    pass
