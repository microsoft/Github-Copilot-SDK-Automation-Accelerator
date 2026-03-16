/* --- Reader IDE — API Client --- */

import type { BookMeta, ToolEvent, Skill, Agent, NoteInfo } from "./types";

const API_BASE = "";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthStatus {
  authenticated: boolean;
  has_token: boolean;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${API_BASE}/api/auth/status`);
  if (!res.ok) throw new Error("Failed to check auth status");
  return res.json();
}

export async function submitToken(token: string): Promise<{ status: string; authenticated: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Authentication failed" }));
    throw new Error(err.detail || "Authentication failed");
  }
  return res.json();
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
  if (!res.ok) throw new Error("Logout failed");
}

// ---------------------------------------------------------------------------
// Skills & Agents
// ---------------------------------------------------------------------------

export async function fetchSkills(): Promise<Skill[]> {
  const res = await fetch(`${API_BASE}/api/skills`);
  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json();
}

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/api/agents`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
}

export async function fetchBooks(): Promise<BookMeta[]> {
  const res = await fetch(`${API_BASE}/api/books`);
  if (!res.ok) throw new Error("Failed to fetch books");
  return res.json();
}

export async function fetchBook(bookId: string): Promise<BookMeta> {
  const res = await fetch(`${API_BASE}/api/books/${bookId}`);
  if (!res.ok) throw new Error("Book not found");
  return res.json();
}

export async function uploadEpub(file: File): Promise<BookMeta> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function deleteBook(bookId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/books/${bookId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
}

export async function fetchChapterText(
  bookId: string,
  chapterFile: string
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/api/books/${bookId}/chapters/${chapterFile}`
  );
  if (!res.ok) throw new Error("Chapter not found");
  const data = await res.json();
  return data.content;
}

/**
 * Stream chat responses via SSE.
 * Forwards real Copilot SDK events: delta, tool_start, tool_complete, reasoning, error.
 */
export async function streamChat(
  bookId: string,
  message: string,
  currentChapter: string | null,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  onToolEvent?: (evt: ToolEvent) => void,
  onReasoning?: (text: string) => void,
  model?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/books/${bookId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      current_chapter: currentChapter,
      model: model || undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Chat error" }));
    onError(err.detail || "Chat error");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("No response stream");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(payload);
        switch (parsed.type) {
          case "delta":
            if (parsed.content) onDelta(parsed.content);
            break;
          case "tool_start":
          case "tool_complete":
            onToolEvent?.(parsed as ToolEvent);
            break;
          case "reasoning":
            onReasoning?.(parsed.content);
            break;
          case "error":
            onError(parsed.message || "SDK error");
            break;
        }
      } catch {
        // skip malformed
      }
    }
  }
  onDone();
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function fetchNotes(bookId: string): Promise<NoteInfo[]> {
  const res = await fetch(`${API_BASE}/api/books/${bookId}/notes`);
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
}

export async function fetchNoteContent(
  bookId: string,
  noteFile: string
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/api/books/${bookId}/notes/${noteFile}`
  );
  if (!res.ok) throw new Error("Note not found");
  const data = await res.json();
  return data.content;
}

export async function deleteNoteApi(
  bookId: string,
  noteFile: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/books/${bookId}/notes/${noteFile}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete note");
}
