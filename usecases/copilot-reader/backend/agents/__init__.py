"""
Agents Registry — @-invoked sub-agents for the Reader IDE companion.

Agents are defined as markdown files (*.agent.md) with YAML frontmatter.
This module auto-discovers them, parses the frontmatter + persona prompt,
and exposes a simple registry.  To add a new agent, just drop a .agent.md
file in backend/agents/ — no Python needed.
"""

import os
import re
from dataclasses import dataclass
from typing import Dict, Optional

import yaml

# ---------------------------------------------------------------------------
# Dataclass
# ---------------------------------------------------------------------------

@dataclass
class Agent:
    """An @-invoked sub-agent parsed from a .agent.md file."""
    name: str                 # e.g. "archivist"
    display_name: str         # e.g. "Archivist"
    description: str          # Short blurb shown in the dropdown
    icon: str                 # Lucide icon name for the frontend
    prompt: str               # Markdown body — persona prompt
    placeholder: str = ""     # Input placeholder hint after selecting

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "icon": self.icon,
            "placeholder": self.placeholder,
        }

    def to_sdk_dict(self) -> dict:
        """Format suitable for the Copilot SDK custom_agents config."""
        return {
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "prompt": self.prompt,
        }


# ---------------------------------------------------------------------------
# Markdown parser
# ---------------------------------------------------------------------------

_FRONT_MATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

def _parse_agent_md(filepath: str) -> Agent:
    """Parse a .agent.md file into an Agent dataclass."""
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()

    m = _FRONT_MATTER_RE.match(text)
    if not m:
        raise ValueError(f"No YAML frontmatter found in {filepath}")

    meta = yaml.safe_load(m.group(1))
    body = text[m.end():].strip()

    required = ("name", "display_name", "description", "icon")
    for key in required:
        if key not in meta:
            raise ValueError(f"Missing required frontmatter key '{key}' in {filepath}")

    return Agent(
        name=meta["name"],
        display_name=meta["display_name"],
        description=meta["description"],
        icon=meta["icon"],
        prompt=body,
        placeholder=meta.get("placeholder", ""),
    )


# ---------------------------------------------------------------------------
# Global registry — auto-populated from *.agent.md files in this directory
# ---------------------------------------------------------------------------

AGENTS: Dict[str, Agent] = {}


def register(agent: Agent):
    """Register an agent (or replace an existing one)."""
    AGENTS[agent.name] = agent


def get_agent(name: str) -> Optional[Agent]:
    """Retrieve an agent by name, or None."""
    return AGENTS.get(name)


def list_agents() -> list[dict]:
    """Return all agents as JSON-serialisable dicts (for the API)."""
    return [a.to_dict() for a in AGENTS.values()]


def all_agents_sdk() -> list[dict]:
    """Return all agents in SDK custom_agents format."""
    return [a.to_sdk_dict() for a in AGENTS.values()]


def _autodiscover():
    """Scan this directory for *.agent.md and register each one."""
    agents_dir = os.path.dirname(os.path.abspath(__file__))
    for fname in sorted(os.listdir(agents_dir)):
        if fname.endswith(".agent.md"):
            filepath = os.path.join(agents_dir, fname)
            try:
                agent = _parse_agent_md(filepath)
                register(agent)
            except Exception as e:
                print(f"[agents] Warning: failed to load {fname}: {e}")


_autodiscover()
