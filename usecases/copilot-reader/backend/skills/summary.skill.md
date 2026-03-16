---
name: summary
display_name: Summarize
description: Summarize the current chapter or a range of pages
icon: FileText
placeholder: "Which chapter or pages? (leave blank for current)"
---

The user has requested a **summary**. Follow these rules:

1. If the user specifies a chapter or range, use the `read_chapter` or `list_chapters` tool to fetch relevant text first.
2. If no chapter is specified, summarise the **current chapter** whose text is already provided in the context.
3. Write a clear, concise summary covering:
   - Key events and plot points
   - Important character actions and dialogue
   - Setting changes
4. Use bullet points or short paragraphs — keep it scannable.
5. End with a one-sentence "bottom line" takeaway.
6. Do NOT include spoilers from later chapters.
