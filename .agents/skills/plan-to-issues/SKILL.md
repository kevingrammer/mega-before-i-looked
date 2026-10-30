---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Every issue carries the shape in "Issue shape" below. Ask the human only if this plan
   needs something it doesn't cover.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## Issue shape

Approved by the repo owner on 2026-10-29 for plan morning-digest. Every issue:

- **Body opens with** `Source: plan.md § <n>`, the plan's own section id (`§ 1`, `§ 2a`).
- **Label** `plan:<plan>`, the `plan:` field of plan.md's frontmatter (e.g. `plan:morning-digest`).
- **Sections, in order:** `## Scope` (bullets, the boundary only), `## Done when` (the plan's
  line, word for word), `## Blocked by` (real issue numbers, or `—`).
- **Last line:** `Close with the comment format in AGENTS.md (done / worker / commit).`

A step that waits on someone outside the repo (a reviewer, a host) stays open until they confirm,
and blocks every issue that undoes it.

Commit messages say `closes #n` only when no closing comment is still owed: GitHub closes the
issue on push, before the comment.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
