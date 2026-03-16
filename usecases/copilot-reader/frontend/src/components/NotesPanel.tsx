import { useEffect, useState, useCallback } from "react";
import { FileText, StickyNote, Trash2, RefreshCw } from "lucide-react";
import { fetchNotes, fetchNoteContent, deleteNoteApi } from "../api";
import type { NoteInfo } from "../types";
import "./NotesPanel.css";

interface NotesPanelProps {
  bookId: string;
  /** Incremented externally (e.g. after a chat tool creates a note) to trigger a refresh */
  refreshKey?: number;
}

export default function NotesPanel({ bookId, refreshKey }: NotesPanelProps) {
  const [notes, setNotes] = useState<NoteInfo[]>([]);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotes(bookId);
      setNotes(data);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  // Reload note list when bookId or refreshKey changes
  useEffect(() => {
    loadNotes();
  }, [loadNotes, refreshKey]);

  // Load content when a note is selected
  useEffect(() => {
    if (!activeNote) {
      setContent("");
      return;
    }
    let cancelled = false;
    setLoadingContent(true);
    fetchNoteContent(bookId, activeNote)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setContent("Failed to load note.");
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId, activeNote]);

  const handleDelete = async (filename: string) => {
    try {
      await deleteNoteApi(bookId, filename);
      if (activeNote === filename) {
        setActiveNote(null);
        setContent("");
      }
      loadNotes();
    } catch {
      // ignore
    }
  };

  return (
    <div className="notes-panel">
      {/* Header */}
      <div className="notes-panel-header">
        <StickyNote size={14} />
        <span>NOTES</span>
        <button
          className="notes-refresh-btn"
          onClick={loadNotes}
          title="Refresh notes"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Two-part layout: list + viewer */}
      <div className="notes-panel-body">
        {/* Note list */}
        <div className="notes-list">
          {loading ? (
            <div className="notes-empty">Loading...</div>
          ) : notes.length === 0 ? (
            <div className="notes-empty">
              No notes yet. Ask the assistant to create notes for you!
            </div>
          ) : (
            notes.map((n) => (
              <div
                key={n.filename}
                className={`notes-list-item ${
                  activeNote === n.filename ? "active" : ""
                }`}
                onClick={() => setActiveNote(n.filename)}
              >
                <FileText size={14} className="notes-icon" />
                <span className="notes-item-title">{n.title}</span>
                <button
                  className="notes-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(n.filename);
                  }}
                  title="Delete note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Note content viewer */}
        {activeNote && (
          <div className="notes-content">
            <div className="notes-content-header">
              <FileText size={14} />
              <span>{activeNote}</span>
            </div>
            <div className="notes-content-body">
              {loadingContent ? (
                <div className="notes-loading">Loading note...</div>
              ) : (
                <div className="notes-text">
                  {content.split(/\n/).map((line, i) => (
                    <p key={i}>{line || "\u00A0"}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
