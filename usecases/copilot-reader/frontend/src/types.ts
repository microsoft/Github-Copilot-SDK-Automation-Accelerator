/* --- Reader IDE — Types --- */

export interface ChapterInfo {
  filename: string;
  title: string;
  order: number;
  char_count: number;
}

export interface BookMeta {
  book_id: string;
  title: string;
  authors: string[];
  language: string;
  description: string | null;
  publisher: string | null;
  date: string | null;
  subjects: string[];
  chapters: ChapterInfo[];
  processed_at: string;
}

export interface ToolEvent {
  type: "tool_start" | "tool_complete";
  tool_name: string;
  arguments?: string;    // JSON string of args (tool_start)
  result?: string;       // JSON string of result preview (tool_complete)
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  events?: ToolEvent[];  // real SDK events (tool calls, etc.)
  reasoning?: string;    // accumulated reasoning text
}

export interface Skill {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  placeholder: string;
}

export interface Agent {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  placeholder: string;
}

export interface NoteInfo {
  filename: string;
  title: string;
  size: number;
  modified: number;
}
