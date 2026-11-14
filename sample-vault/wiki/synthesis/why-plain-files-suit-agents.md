---
type: synthesis
title: Why plain files suit AI agents
created: 2026-11-14
updated: 2026-11-14
sources: [raw/articles/2026-11-10-local-first-software-notes.md, raw/other/2026-11-12-field-notes-sync-conflicts.md]
status: draft
---

# Why plain files suit AI agents

This page holds my conclusions, not what the sources say. It was saved from a question asked on 2026-11-14.

## Question
Is a folder of plain Markdown files a good base for a knowledge base that people and AI agents both edit?

## Conclusion
Yes, with one condition: more than one writer needs rules. Plain files give an agent direct access to the full context and
keep every change readable. The weak point is concurrent editing, where the sources disagree on how often it goes wrong.

## Reasoning
- A readable format is something an agent can open without special tools ([[plain-text-files]]).
- Data that stays on the device can be read and changed without a vendor in between ([[local-first]]).
- Conflicts become readable ([[sync-conflict-field-notes]]), and many small files reduce them ([[sync-conflicts]]).
- With people and an agent both writing, the setup looks more like the three-writer team than the lone writer, so the
  higher conflict rate is the safer assumption. This is my inference.

## Uncertainties
- The two sources disagree about how common conflicts are ([[sync-conflicts]]); their setups differ, so this is open.
- Both sources are short and from individuals; neither measured anything formally.

## What to check next
- Find a source that measures conflicts for a given number of writers.
- Try the rule "an agent edits only the pages its task names" and see whether conflicts drop.
