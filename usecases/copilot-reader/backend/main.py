"""
Reader IDE — FastAPI Backend
Handles EPUB upload, book library CRUD, chapter serving, and Copilot chat SSE.
"""

import os
import shutil
import tempfile
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from epub_processor import (
    process_epub,
    delete_book,
    list_books,
    get_book_metadata,
    get_chapter_text,
)
from copilot_chat import ChatManager
from skills import list_skills
from agents import list_agents

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

chat_manager = ChatManager(data_dir=DATA_DIR)

# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start/stop the CopilotClient with the server."""
    # Try to auto-start if GITHUB_TOKEN is already in the environment
    if os.environ.get("GITHUB_TOKEN"):
        try:
            await chat_manager.start()
            print("✅ Copilot SDK client started (env token)")
        except Exception as e:
            print(f"⚠️  Copilot SDK failed to start: {e}")
    else:
        print("ℹ️  No GITHUB_TOKEN found — waiting for user to authenticate via UI")
    yield
    try:
        await chat_manager.stop()
        print("Copilot SDK client stopped")
    except Exception:
        pass


app = FastAPI(title="Reader IDE API", lifespan=lifespan)

# CORS — allow the Vite dev server and same-origin in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    # In production (Docker), serve the React SPA; otherwise return health JSON
    static_index = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "static", "index.html"
    )
    if os.path.isfile(static_index):
        return FileResponse(static_index)
    return {"status": "ok", "service": "Reader IDE API"}


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

ALLOWED_MODELS = ["gpt-4.1", "claude-sonnet-4", "gpt-5-mini"]


class ChatRequest(BaseModel):
    message: str
    current_chapter: Optional[str] = None
    model: Optional[str] = None


class TokenRequest(BaseModel):
    token: str


# ---------------------------------------------------------------------------
# Routes — Authentication
# ---------------------------------------------------------------------------

@app.get("/api/auth/status")
async def auth_status():
    """Check whether the Copilot SDK is authenticated and ready."""
    return {
        "authenticated": chat_manager.is_authenticated,
        "has_token": chat_manager.has_token,
    }


@app.post("/api/auth/token")
async def set_token(req: TokenRequest):
    """Set GitHub token and (re)start the Copilot SDK client."""
    token = req.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token cannot be empty")
    try:
        await chat_manager.restart_with_token(token)
        return {"status": "ok", "authenticated": True}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start Copilot SDK with the provided token: {e}",
        )


@app.post("/api/auth/logout")
async def logout():
    """Clear token and stop the Copilot SDK client."""
    await chat_manager.stop()
    chat_manager.clear_token()
    return {"status": "ok", "authenticated": False}


# ---------------------------------------------------------------------------
# Routes — Skills
# ---------------------------------------------------------------------------

@app.get("/api/skills")
async def get_skills():
    """Return all available slash-command skills."""
    return list_skills()


@app.get("/api/agents")
async def get_agents():
    """Return all available @-invoked sub-agents."""
    return list_agents()


# ---------------------------------------------------------------------------
# Routes — Library
# ---------------------------------------------------------------------------

@app.post("/api/upload")
async def upload_epub(file: UploadFile = File(...)):
    """Upload an EPUB file, process it, and add to the library."""
    if not file.filename or not file.filename.lower().endswith(".epub"):
        raise HTTPException(status_code=400, detail="Only .epub files are accepted")

    # Save to a temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".epub")
    try:
        content = await file.read()
        tmp.write(content)
        tmp.close()

        result = process_epub(tmp.name, DATA_DIR)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process EPUB: {str(e)}")
    finally:
        os.unlink(tmp.name)


@app.get("/api/books")
async def get_books():
    """List all books in the library."""
    return list_books(DATA_DIR)


@app.get("/api/books/{book_id}")
async def get_book(book_id: str):
    """Get metadata for a specific book."""
    meta = get_book_metadata(book_id, DATA_DIR)
    if not meta:
        raise HTTPException(status_code=404, detail="Book not found")
    return meta


@app.delete("/api/books/{book_id}")
async def remove_book(book_id: str):
    """Delete a book from the library."""
    if delete_book(book_id, DATA_DIR):
        return {"status": "deleted", "book_id": book_id}
    raise HTTPException(status_code=404, detail="Book not found")


# ---------------------------------------------------------------------------
# Routes — Chapters
# ---------------------------------------------------------------------------

@app.get("/api/books/{book_id}/chapters")
async def get_chapters(book_id: str):
    """List chapters for a book."""
    meta = get_book_metadata(book_id, DATA_DIR)
    if not meta:
        raise HTTPException(status_code=404, detail="Book not found")
    return meta.get("chapters", [])


@app.get("/api/books/{book_id}/chapters/{chapter_file}")
async def read_chapter(book_id: str, chapter_file: str):
    """Return the plain text of a chapter."""
    text = get_chapter_text(book_id, chapter_file, DATA_DIR)
    if text is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {"filename": chapter_file, "content": text}


# ---------------------------------------------------------------------------
# Routes — Notes
# ---------------------------------------------------------------------------

@app.get("/api/books/{book_id}/notes")
async def get_notes(book_id: str):
    """List all notes for a book."""
    notes_dir = os.path.join(DATA_DIR, f"{book_id}_notes")
    if not os.path.isdir(notes_dir):
        return []
    files = sorted(f for f in os.listdir(notes_dir) if f.endswith(".txt"))
    result = []
    for f in files:
        fpath = os.path.join(notes_dir, f)
        stat = os.stat(fpath)
        result.append({
            "filename": f,
            "title": f.replace("_", " ").removesuffix(".txt"),
            "size": stat.st_size,
            "modified": stat.st_mtime,
        })
    return result


@app.get("/api/books/{book_id}/notes/{note_file}")
async def read_note(book_id: str, note_file: str):
    """Return the content of a specific note."""
    notes_dir = os.path.join(DATA_DIR, f"{book_id}_notes")
    filepath = os.path.join(notes_dir, note_file)
    resolved = os.path.realpath(filepath)
    if not resolved.startswith(os.path.realpath(notes_dir)):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Note not found")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    return {"filename": note_file, "content": content}


@app.delete("/api/books/{book_id}/notes/{note_file}")
async def delete_note(book_id: str, note_file: str):
    """Delete a specific note."""
    notes_dir = os.path.join(DATA_DIR, f"{book_id}_notes")
    filepath = os.path.join(notes_dir, note_file)
    resolved = os.path.realpath(filepath)
    if not resolved.startswith(os.path.realpath(notes_dir)):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Note not found")
    os.remove(filepath)
    return {"status": "deleted", "filename": note_file}


# ---------------------------------------------------------------------------
# Routes — Chat (SSE)
# ---------------------------------------------------------------------------

@app.post("/api/books/{book_id}/chat")
async def chat(book_id: str, req: ChatRequest):
    """
    Send a message to the Copilot reading companion.
    Returns a Server-Sent Events stream of response deltas.
    """
    meta = get_book_metadata(book_id, DATA_DIR)
    if not meta:
        raise HTTPException(status_code=404, detail="Book not found")

    if not chat_manager._client:
        raise HTTPException(
            status_code=503,
            detail="Copilot SDK is not connected. Please provide your GitHub token on the landing page first.",
        )

    model = req.model if req.model in ALLOWED_MODELS else "gpt-4.1"

    return StreamingResponse(
        chat_manager.chat_stream(
            book_id=book_id,
            message=req.message,
            current_chapter=req.current_chapter,
            model=model,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Static file serving (production — serves built React app)
# ---------------------------------------------------------------------------

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

if os.path.isdir(STATIC_DIR):
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the React SPA for any non-API route."""
        # If the path points to an actual file in static/, serve it
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise serve index.html (React Router handles the rest)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
