import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { fetchChapterText } from "../api";
import type { ChapterInfo } from "../types";
import "./TextViewer.css";

interface TextViewerProps {
  bookId: string;
  chapterFile: string | null;
  chapters: ChapterInfo[];
}

export default function TextViewer({
  bookId,
  chapterFile,
  chapters,
}: TextViewerProps) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const currentChapter = chapters.find((c) => c.filename === chapterFile);

  useEffect(() => {
    if (!chapterFile) {
      setText("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchChapterText(bookId, chapterFile)
      .then((content) => {
        if (!cancelled) setText(content);
      })
      .catch(() => {
        if (!cancelled) setText("Failed to load chapter.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterFile]);

  if (!chapterFile) {
    return (
      <div className="text-viewer-empty">
        <FileText size={48} strokeWidth={1} />
        <p>Select a chapter from the explorer</p>
      </div>
    );
  }

  return (
    <div className="text-viewer">
      {/* Tab bar */}
      <div className="text-viewer-tabs">
        <div className="tab active">
          <FileText size={14} />
          <span>{currentChapter?.title || chapterFile}</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="text-viewer-breadcrumb">
        <span className="breadcrumb-book">{bookId}</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-file">{chapterFile}</span>
      </div>

      {/* Content */}
      <div className="text-viewer-content">
        {loading ? (
          <div className="text-viewer-loading">Loading chapter...</div>
        ) : (
          <div className="text-content">
            {text.split(/\n{2,}|\.\s{2,}/).map((paragraph, i) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;
              return <p key={i}>{trimmed}</p>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
