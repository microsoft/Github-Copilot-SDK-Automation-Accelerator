"""
Skills Registry — slash-command skills for the Reader IDE agent.

Skills are defined as markdown files (*.skill.md) with YAML frontmatter.
This module auto-discovers them, parses the frontmatter + prompt body,
and exposes a simple registry.  To add a new skill, just drop a .skill.md
file in backend/skills/ — no Python needed.
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
class Skill:
    """A slash-command skill parsed from a .skill.md file."""
    name: str                   # e.g. "summary"
    display_name: str           # e.g. "Summarize"
    description: str            # Short blurb shown in the dropdown
    icon: str                   # Lucide icon name for the frontend
    prompt_template: str        # Markdown body — injected into the prompt
    placeholder: str = ""       # Input placeholder hint after selecting

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "icon": self.icon,
            "placeholder": self.placeholder,
        }


# ---------------------------------------------------------------------------
# Markdown parser
# ---------------------------------------------------------------------------

_FRONT_MATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

def _parse_skill_md(filepath: str) -> Skill:
    """Parse a .skill.md file into a Skill dataclass."""
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

    return Skill(
        name=meta["name"],
        display_name=meta["display_name"],
        description=meta["description"],
        icon=meta["icon"],
        prompt_template=body,
        placeholder=meta.get("placeholder", ""),
    )


# ---------------------------------------------------------------------------
# Global registry — auto-populated from *.skill.md files in this directory
# ---------------------------------------------------------------------------

SKILLS: Dict[str, Skill] = {}


def register(skill: Skill):
    """Register a skill (or replace an existing one)."""
    SKILLS[skill.name] = skill


def get_skill(name: str) -> Optional[Skill]:
    """Retrieve a skill by its slash-command name, or None."""
    return SKILLS.get(name)


def list_skills() -> list[dict]:
    """Return all skills as JSON-serialisable dicts (for the API)."""
    return [s.to_dict() for s in SKILLS.values()]


def _autodiscover():
    """Scan this directory for *.skill.md and register each one."""
    skills_dir = os.path.dirname(os.path.abspath(__file__))
    for fname in sorted(os.listdir(skills_dir)):
        if fname.endswith(".skill.md"):
            filepath = os.path.join(skills_dir, fname)
            try:
                skill = _parse_skill_md(filepath)
                register(skill)
            except Exception as e:
                print(f"[skills] Warning: failed to load {fname}: {e}")


_autodiscover()
