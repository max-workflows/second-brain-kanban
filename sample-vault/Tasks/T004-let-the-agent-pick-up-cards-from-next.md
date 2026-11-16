---
created: 2026-11-02
---

# Let the agent pick up cards from Next

An agent takes the first card in Next, works from its task file and moves it to Review.

Why: the card is the assignment. Status is the column, the details are in this file, so the agent needs nothing else.

Rules for the agent:
- One card per run, work only inside the vault
- Never read secrets, never move a card to Done
- Write the result under a "Result" heading and log the run

Done when one card goes from Next to Review on its own and a human approves the result.
