import { FileText, FolderOpen } from "lucide-react";
import type { ChapterInfo } from "../types";
import "./FileTree.css";

interface FileTreeProps {
  bookId: string;
  chapters: ChapterInfo[];
  activeChapter: string | null;
  onSelect: (filename: string) => void;
}

export default function FileTree({
  bookId,
  chapters,
  activeChapter,
  onSelect,
}: FileTreeProps) {
  return (
    <div className="file-tree">
      {/* Root folder */}
      <div className="file-tree-folder">
        <FolderOpen size={16} className="icon-folder" />
        <span className="folder-name">{bookId}</span>
      </div>

      {/* Chapter files */}
      <div className="file-tree-files">
        {chapters.map((ch) => (
          <div
            key={ch.filename}
            className={`file-tree-item ${
              activeChapter === ch.filename ? "active" : ""
            }`}
            onClick={() => onSelect(ch.filename)}
            title={ch.title}
          >
            <FileText size={14} className="icon-file" />
            <span className="file-name">{ch.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
