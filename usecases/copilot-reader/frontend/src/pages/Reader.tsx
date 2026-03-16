import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { ArrowLeft, FolderOpen, StickyNote } from "lucide-react";
import FileTree from "../components/FileTree";
import TextViewer from "../components/TextViewer";
import CopilotChat from "../components/CopilotChat";
import NotesPanel from "../components/NotesPanel";
import { fetchBook } from "../api";
import type { BookMeta } from "../types";
import "./Reader.css";

export default function Reader() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookMeta | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"explorer" | "notes">("explorer");
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  useEffect(() => {
    if (!bookId) return;
    fetchBook(bookId)
      .then((data) => {
        setBook(data);
        // Open first chapter by default
        if (data.chapters.length > 0) {
          setActiveChapter(data.chapters[0].filename);
        }
      })
      .catch(() => setError("Book not found"));
  }, [bookId]);

  const handleSelectChapter = useCallback((filename: string) => {
    setActiveChapter(filename);
  }, []);

  if (error) {
    return (
      <div className="reader-error">
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Back to Library</button>
      </div>
    );
  }

  if (!book || !bookId) {
    return <div className="reader-loading">Loading book...</div>;
  }

  return (
    <div className="reader-page">
      {/* Title Bar */}
      <div className="reader-titlebar">
        <button className="titlebar-back" onClick={() => navigate("/")}>
          <ArrowLeft size={16} />
        </button>
        <span className="titlebar-title">
          Reader IDE — {book.title}
        </span>
        {book.authors.length > 0 && (
          <span className="titlebar-author">
            by {book.authors.join(", ")}
          </span>
        )}
      </div>

      {/* Three-panel layout */}
      <div className="reader-panels">
        <PanelGroup direction="horizontal" autoSaveId="reader-layout">
          {/* Left: File Tree / Explorer */}
          <Panel defaultSize={20} minSize={15} maxSize={35}>
            <div className="panel-sidebar">
              {/* Sidebar tab switcher */}
              <div className="sidebar-tabs">
                <button
                  className={`sidebar-tab ${sidebarTab === "explorer" ? "active" : ""}`}
                  onClick={() => setSidebarTab("explorer")}
                >
                  <FolderOpen size={14} />
                  <span>Explorer</span>
                </button>
                <button
                  className={`sidebar-tab ${sidebarTab === "notes" ? "active" : ""}`}
                  onClick={() => {
                    setSidebarTab("notes");
                    setNotesRefreshKey((k) => k + 1);
                  }}
                >
                  <StickyNote size={14} />
                  <span>Notes</span>
                </button>
              </div>

              {sidebarTab === "explorer" ? (
                <FileTree
                  bookId={bookId}
                  chapters={book.chapters}
                  activeChapter={activeChapter}
                  onSelect={handleSelectChapter}
                />
              ) : (
                <NotesPanel
                  bookId={bookId}
                  refreshKey={notesRefreshKey}
                />
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          {/* Center: Text Viewer */}
          <Panel defaultSize={50} minSize={30}>
            <TextViewer
              bookId={bookId}
              chapterFile={activeChapter}
              chapters={book.chapters}
            />
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          {/* Right: Copilot Chat */}
          <Panel defaultSize={30} minSize={20} maxSize={45}>
            <CopilotChat
              bookId={bookId}
              bookTitle={book.title}
              currentChapter={activeChapter}
              onNoteChange={() => setNotesRefreshKey((k) => k + 1)}
            />
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <div className="reader-statusbar">
        <span>{book.title}</span>
        <span>
          {activeChapter
            ? book.chapters.find((c) => c.filename === activeChapter)?.title || activeChapter
            : "No chapter selected"}
        </span>
        <span>{book.chapters.length} chapters</span>
      </div>
    </div>
  );
}
