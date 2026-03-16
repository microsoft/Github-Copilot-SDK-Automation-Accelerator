import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, User, Loader2,
  Wrench, ChevronRight, ChevronDown, CheckCircle2, Play,
  Brain, Search, BookOpen, List,
  FileText, Clock, Rewind, HelpCircle, Sparkles, Slash,
  BookUser, Lightbulb, PenTool, Swords, Landmark, AtSign,
  StickyNote, Trash2, PenLine,
} from "lucide-react";
import Markdown from "react-markdown";
import { streamChat, fetchSkills, fetchAgents } from "../api";
import type { ChatMessage, ToolEvent, Skill, Agent } from "../types";
import "./CopilotChat.css";

/* --- Pretty tool name + icon mapping --- */
const TOOL_DISPLAY: Record<string, { label: string; icon: typeof Wrench }> = {
  read_chapter: { label: "Reading chapter", icon: BookOpen },
  list_chapters: { label: "Listing chapters", icon: List },
  search_book: { label: "Searching book", icon: Search },
  create_note: { label: "Creating note", icon: StickyNote },
  edit_note: { label: "Editing note", icon: PenLine },
  append_note: { label: "Appending to note", icon: PenLine },
  list_notes: { label: "Listing notes", icon: List },
  read_note: { label: "Reading note", icon: FileText },
  delete_note: { label: "Deleting note", icon: Trash2 },
};

function toolLabel(name: string, done: boolean) {
  const entry = TOOL_DISPLAY[name];
  if (entry) return done ? entry.label.replace(/ing\b/, "ed").replace("Listing", "Listed") : entry.label + "...";
  return done ? `Ran ${name}` : `Running ${name}...`;
}

function ToolIcon({ name }: { name: string }) {
  const entry = TOOL_DISPLAY[name];
  const Icon = entry?.icon ?? Wrench;
  return <Icon size={12} />;
}

/* --- ToolEvents: live inline indicators while streaming, collapsible after --- */
function ToolEvents({ events, isStreaming }: { events: ToolEvent[]; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  // Group into pairs: tool_start → tool_complete (merged into single entries)
  const toolCalls: { name: string; args?: string; result?: string; done: boolean }[] = [];
  for (const evt of events) {
    if (evt.type === "tool_start") {
      toolCalls.push({ name: evt.tool_name, args: evt.arguments, done: false });
    } else if (evt.type === "tool_complete") {
      // Try exact name match first, then fall back to most recent uncompleted
      let existing = [...toolCalls].reverse().find((t) => t.name === evt.tool_name && !t.done);
      if (!existing) {
        existing = [...toolCalls].reverse().find((t) => !t.done);
      }
      if (existing) {
        existing.result = evt.result;
        existing.done = true;
        // Prefer the more descriptive name (start name over "unknown")
        if (evt.tool_name && evt.tool_name !== "unknown" && existing.name === "unknown") {
          existing.name = evt.tool_name;
        }
      } else {
        toolCalls.push({ name: evt.tool_name, result: evt.result, done: true });
      }
    }
  }

  /* While streaming: show each tool call as a live inline chip */
  if (isStreaming) {
    return (
      <div className="tool-events-live">
        {toolCalls.map((tc, i) => (
          <div key={i} className={`tool-chip ${tc.done ? "done" : "active"}`}>
            {tc.done ? (
              <CheckCircle2 size={12} className="tool-chip-icon done" />
            ) : (
              <Loader2 size={12} className="tool-chip-icon spin" />
            )}
            <ToolIcon name={tc.name} />
            <span className="tool-chip-label">{toolLabel(tc.name, tc.done)}</span>
          </div>
        ))}
      </div>
    );
  }

  /* After streaming: collapsible detail view */
  return (
    <div className="tool-events">
      <button
        className="tool-events-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Wrench size={12} />
        <span>
          Used {toolCalls.length} tool{toolCalls.length !== 1 ? "s" : ""}
        </span>
      </button>
      {expanded && (
        <div className="tool-events-list">
          {toolCalls.map((tc, i) => (
            <div key={i} className={`tool-call ${tc.done ? "complete" : "running"}`}>
              <div className="tool-call-header">
                {tc.done ? (
                  <CheckCircle2 size={12} className="tool-icon-done" />
                ) : (
                  <Play size={12} className="tool-icon-running" />
                )}
                <span className="tool-call-name">{tc.name}</span>
                <span className="tool-call-status">
                  {tc.done ? "completed" : "running..."}
                </span>
              </div>
              {tc.args && (
                <div className="tool-call-detail">
                  <span className="tool-call-label">Args:</span>
                  <code>{tc.args}</code>
                </div>
              )}
              {tc.result && (
                <div className="tool-call-detail">
                  <span className="tool-call-label">Result:</span>
                  <code>{tc.result}</code>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Reasoning: live streaming text while active, collapsible after --- */

/* --- Skill icon mapping --- */
const SKILL_ICONS: Record<string, typeof Wrench> = {
  FileText,
  Clock,
  Rewind,
  HelpCircle,
  Sparkles,
};

function SkillIcon({ iconName }: { iconName: string }) {
  const Icon = SKILL_ICONS[iconName] ?? Slash;
  return <Icon size={14} />;
}

/* --- Slash-command skill menu --- */
function SkillMenu({
  skills,
  filter,
  selectedIndex,
  onSelect,
}: {
  skills: Skill[];
  filter: string;
  selectedIndex: number;
  onSelect: (skill: Skill) => void;
}) {
  const filtered = skills.filter(
    (s) =>
      s.name.includes(filter.toLowerCase()) ||
      s.display_name.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div className="skill-menu">
      <div className="skill-menu-header">
        <Slash size={12} />
        <span>Skills</span>
      </div>
      {filtered.map((skill, i) => (
        <button
          key={skill.name}
          className={`skill-menu-item ${i === selectedIndex ? "selected" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault(); // prevent blur
            onSelect(skill);
          }}
        >
          <div className="skill-menu-icon">
            <SkillIcon iconName={skill.icon} />
          </div>
          <div className="skill-menu-text">
            <span className="skill-menu-name">/{skill.name}</span>
            <span className="skill-menu-desc">{skill.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* --- Agent icon mapping --- */
const AGENT_ICONS: Record<string, typeof Wrench> = {
  BookUser,
  Lightbulb,
  PenTool,
  Swords,
  Landmark,
};

function AgentIcon({ iconName }: { iconName: string }) {
  const Icon = AGENT_ICONS[iconName] ?? AtSign;
  return <Icon size={14} />;
}

/* --- @-command agent menu --- */
function AgentMenu({
  agents,
  filter,
  selectedIndex,
  onSelect,
}: {
  agents: Agent[];
  filter: string;
  selectedIndex: number;
  onSelect: (agent: Agent) => void;
}) {
  const filtered = agents.filter(
    (a) =>
      a.name.includes(filter.toLowerCase()) ||
      a.display_name.toLowerCase().includes(filter.toLowerCase()) ||
      a.description.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div className="agent-menu">
      <div className="agent-menu-header">
        <AtSign size={12} />
        <span>Agents</span>
      </div>
      {filtered.map((agent, i) => (
        <button
          key={agent.name}
          className={`agent-menu-item ${i === selectedIndex ? "selected" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(agent);
          }}
        >
          <div className="agent-menu-icon">
            <AgentIcon iconName={agent.icon} />
          </div>
          <div className="agent-menu-text">
            <span className="agent-menu-name">@{agent.name}</span>
            <span className="agent-menu-desc">{agent.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function ReasoningBlock({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const reasoningEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll reasoning box while streaming
  useEffect(() => {
    if (isStreaming && reasoningEndRef.current) {
      reasoningEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [text, isStreaming]);

  if (isStreaming) {
    return (
      <div className="reasoning-block reasoning-streaming">
        <div className="reasoning-header-live">
          <Brain size={12} className="reasoning-live-icon spin-slow" />
          <span className="reasoning-live-label">Thinking...</span>
        </div>
        {text && (
          <div className="reasoning-text streaming">
            {text}
            <div ref={reasoningEndRef} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="reasoning-block">
      <button className="reasoning-toggle" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>Thought process</span>
      </button>
      {expanded && <div className="reasoning-text">{text}</div>}
    </div>
  );
}

interface CopilotChatProps {
  bookId: string;
  bookTitle: string;
  currentChapter: string | null;
  onNoteChange?: () => void;
}

export default function CopilotChat({
  bookId,
  bookTitle,
  currentChapter,
  onNoteChange,
}: CopilotChatProps) {
  const AVAILABLE_MODELS = ["gpt-4.1", "claude-sonnet-4", "gpt-5-mini"];
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Skill menu state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [skillMenuIndex, setSkillMenuIndex] = useState(0);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);

  // Agent menu state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [agentFilter, setAgentFilter] = useState("");
  const [agentMenuIndex, setAgentMenuIndex] = useState(0);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  // Load skills and agents on mount
  useEffect(() => {
    fetchSkills()
      .then(setSkills)
      .catch(() => {/* skills unavailable */});
    fetchAgents()
      .then(setAgents)
      .catch(() => {/* agents unavailable */});
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect slash or @ in input to show/hide menus
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setInput(val);

      if (activeSkill || activeAgent) {
        // If a skill/agent is already selected, don't show menus
        return;
      }

      // Show skill menu when input starts with "/"
      if (val.startsWith("/")) {
        const filter = val.slice(1).split(/\s/)[0];
        setSkillFilter(filter);
        setShowSkillMenu(true);
        setSkillMenuIndex(0);
        setShowAgentMenu(false);
      }
      // Show agent menu when input starts with "@"
      else if (val.startsWith("@")) {
        const filter = val.slice(1).split(/\s/)[0];
        setAgentFilter(filter);
        setShowAgentMenu(true);
        setAgentMenuIndex(0);
        setShowSkillMenu(false);
      } else {
        setShowSkillMenu(false);
        setSkillFilter("");
        setShowAgentMenu(false);
        setAgentFilter("");
      }
    },
    [activeSkill, activeAgent]
  );

  const selectSkill = useCallback(
    (skill: Skill) => {
      setActiveSkill(skill);
      setActiveAgent(null);
      setShowSkillMenu(false);
      setShowAgentMenu(false);
      setSkillFilter("");
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    []
  );

  const clearActiveSkill = useCallback(() => {
    setActiveSkill(null);
  }, []);

  const selectAgent = useCallback(
    (agent: Agent) => {
      setActiveAgent(agent);
      setActiveSkill(null);
      setShowAgentMenu(false);
      setShowSkillMenu(false);
      setAgentFilter("");
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    []
  );

  const clearActiveAgent = useCallback(() => {
    setActiveAgent(null);
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    // Build the actual message: prefix with /skill or @agent if active
    let actualMessage = trimmed;
    let displayMessage = trimmed;

    if (activeSkill) {
      actualMessage = `/${activeSkill.name} ${trimmed}`;
      displayMessage = `/${activeSkill.name} ${trimmed}`;
    } else if (activeAgent) {
      actualMessage = `@${activeAgent.name} ${trimmed}`;
      displayMessage = `@${activeAgent.name} ${trimmed}`;
    }

    setError(null);
    const userMsg: ChatMessage = { role: "user", content: displayMessage };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setActiveSkill(null);
    setActiveAgent(null);
    setShowSkillMenu(false);
    setShowAgentMenu(false);
    setStreaming(true);

    // Add an empty assistant message to fill with streamed data
    const assistantMsg: ChatMessage = { role: "assistant", content: "", events: [] };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      await streamChat(
        bookId,
        actualMessage,
        currentChapter,
        // onDelta — append text content
        (text) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + text,
              };
            }
            return updated;
          });
        },
        // onDone
        () => {
          setStreaming(false);
        },
        // onError
        (err) => {
          setError(err);
          setStreaming(false);
          setMessages((prev) => {
            if (
              prev[prev.length - 1]?.role === "assistant" &&
              !prev[prev.length - 1].content
            ) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        },
        // onToolEvent — real SDK tool_start / tool_complete events
        (evt) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                events: [...(last.events || []), evt],
              };
            }
            return updated;
          });
          // Refresh notes panel when a note tool completes
          if (
            evt.type === "tool_complete" &&
            ["create_note", "edit_note", "append_note", "delete_note"].includes(evt.tool_name)
          ) {
            onNoteChange?.();
          }
        },
        // onReasoning — accumulate reasoning text
        (text) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                reasoning: (last.reasoning || "") + text,
              };
            }
            return updated;
          });
        },
        selectedModel,
      );
    } catch {
      setError("Failed to connect to chat service");
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSkillMenu) {
      const filtered = skills.filter(
        (s) =>
          s.name.includes(skillFilter.toLowerCase()) ||
          s.display_name.toLowerCase().includes(skillFilter.toLowerCase()) ||
          s.description.toLowerCase().includes(skillFilter.toLowerCase())
      );
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSkillMenuIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSkillMenuIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filtered[skillMenuIndex]) {
          selectSkill(filtered[skillMenuIndex]);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSkillMenu(false);
        return;
      }
    }

    if (showAgentMenu) {
      const filtered = agents.filter(
        (a) =>
          a.name.includes(agentFilter.toLowerCase()) ||
          a.display_name.toLowerCase().includes(agentFilter.toLowerCase()) ||
          a.description.toLowerCase().includes(agentFilter.toLowerCase())
      );
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAgentMenuIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAgentMenuIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filtered[agentMenuIndex]) {
          selectAgent(filtered[agentMenuIndex]);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowAgentMenu(false);
        return;
      }
    }

    // Clear active skill/agent on Backspace when input is empty
    if (e.key === "Backspace" && input === "" && activeSkill) {
      e.preventDefault();
      clearActiveSkill();
      return;
    }
    if (e.key === "Backspace" && input === "" && activeAgent) {
      e.preventDefault();
      clearActiveAgent();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="copilot-chat">
      {/* Header */}
      <div className="chat-header">
        <Bot size={16} />
        <span>Copilot — {bookTitle}</span>
        <select
          className="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={streaming}
          title="Select model"
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <Bot size={32} strokeWidth={1} />
            <p>
              Hi! I'm your reading companion for <strong>{bookTitle}</strong>.
              Ask me anything about the book — themes, characters, plot, writing
              style, or what's happening in the current chapter.
            </p>
            <p className="chat-welcome-hint">
              Type <kbd>/</kbd> for skills like summary, timeline, recap, and more.
            </p>
            <p className="chat-welcome-hint">
              Type <kbd>@</kbd> for agents like archivist, philosopher, critic, and more.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-message-avatar">
              {msg.role === "user" ? (
                <User size={16} />
              ) : (
                <Bot size={16} />
              )}
            </div>
            <div className="chat-message-content">
              {/* Tool events (real SDK events) — live while streaming, collapsible after */}
              {msg.role === "assistant" && msg.events && msg.events.length > 0 && (
                <ToolEvents events={msg.events} isStreaming={streaming && i === messages.length - 1} />
              )}
              {/* Reasoning — live pulse while streaming, collapsible after */}
              {msg.role === "assistant" && msg.reasoning && (
                <ReasoningBlock text={msg.reasoning} isStreaming={streaming && i === messages.length - 1} />
              )}
              {/* Main content */}
              {msg.content ? (
                msg.role === "assistant" ? (
                  <div className="markdown-body">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : (
                  msg.content
                )
              ) : (streaming && i === messages.length - 1 ? (
                <Loader2 size={14} className="spin" />
              ) : null)}
            </div>
          </div>
        ))}

        {error && <div className="chat-error">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        {/* Skill menu dropdown */}
        {showSkillMenu && skills.length > 0 && (
          <SkillMenu
            skills={skills}
            filter={skillFilter}
            selectedIndex={skillMenuIndex}
            onSelect={selectSkill}
          />
        )}
        {/* Agent menu dropdown */}
        {showAgentMenu && agents.length > 0 && (
          <AgentMenu
            agents={agents}
            filter={agentFilter}
            selectedIndex={agentMenuIndex}
            onSelect={selectAgent}
          />
        )}
        <div className="chat-input-wrapper">
          {/* Active skill badge */}
          {activeSkill && (
            <span className="active-skill-badge" onClick={clearActiveSkill} title="Click to remove">
              <SkillIcon iconName={activeSkill.icon} />
              <span>/{activeSkill.name}</span>
              <span className="active-skill-x">&times;</span>
            </span>
          )}
          {/* Active agent badge */}
          {activeAgent && (
            <span className="active-agent-badge" onClick={clearActiveAgent} title="Click to remove">
              <AgentIcon iconName={activeAgent.icon} />
              <span>@{activeAgent.name}</span>
              <span className="active-agent-x">&times;</span>
            </span>
          )}
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={
              activeAgent
                ? activeAgent.placeholder || `Chat with ${activeAgent.display_name}...`
                : activeSkill
                  ? activeSkill.placeholder || `Ask about ${activeSkill.display_name.toLowerCase()}...`
                  : "Ask about the book... (type / for skills, @ for agents)"
            }
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={1}
          />
        </div>
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={!input.trim() || streaming}
          title="Send message"
        >
          {streaming ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
