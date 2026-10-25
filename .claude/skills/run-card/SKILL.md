---
name: run-card
description: End-to-end card run for GovTok — runs `start-card` (ramp-up + implementation) in this session, then hands the finished change to a separate review agent that runs `review-card` (which spins up its own two adversarial reviewers). Pings the user's phone via PushNotification whenever a stage needs their input. Use when the user wants to start a card and have it built and reviewed hands-off.
metadata:
  author: david
  version: "0.1.0"
---

# Run card

Chains `start-card` → implementation → `review-card` so a card can go from branch to reviewed change without the user watching. This skill only orchestrates — the per-stage instructions live in `.claude/skills/start-card/SKILL.md` and `.claude/skills/review-card/SKILL.md`; follow those, don't restate or drift from them.

## Ping rule (applies to every stage)

The user is assumed to be away from the terminal. Any time you need their input, **send `PushNotification` first, then ask** — `AskUserQuestion` blocks silently, so without the ping the run just stalls unseen.

- Message: one line, <200 chars, no markdown, lead with the card ID and what they need to decide. E.g. `US7 needs you: AC3 conflicts with spec §5.1.1 (autoplay vs tap-to-play) — pick one`.
- Ping only for things that genuinely need the user: an ambiguous AC, a decision the spec doesn't cover, a Definition of Ready failure, an unmerged dependency, a failing build/test you can't resolve from the code, or a blocking review finding. Never ping for routine progress.
- Phone delivery requires Remote Control to be connected; a "not sent" result just means it was redundant or had nowhere to go — carry on and ask anyway.
- Subagents can't reach the user. Only this (main) session pings or asks.

## 1. Start the card

Invoke the `start-card` skill (via `Skill`, passing through any issue number/slug argument this skill received) and follow it through step 6.

- Its "ask, then start" step is where most pings come from — apply the ping rule there.
- Invoking `run-card` is the user's go-ahead to implement: write the plan to `tasks/<CardID>-todo.md` (e.g. `tasks/US4-todo.md`; one file per card so parallel cards never collide) and begin without waiting for plan approval, **unless** step 5/6 surfaced something that needs a decision — then ping and ask.

## 2. Implement and verify

Build the card per the plan, tracking progress in `tasks/<CardID>-todo.md`. Before handing off, prove it works per the global "Verification Before Done" rule: run the relevant build, type check, tests (and a Convex push for schema/function changes). If something fails and the fix isn't determinable from the code/spec, ping and ask rather than pushing through.

Other `run-card` sessions may be running in sibling worktrees (see `dispatch-cards`). Never push a worktree's functions or schema to the shared Convex cloud dev deployment, because each push replaces the others'. Use a local Convex deployment per worktree (see `npx convex dev --help`). If that isn't set up yet, serialize pushes with `flock /tmp/govtok-convex.lock <command>` and say so in the report.

Do **not** commit or push — git is manual for this user.

## 3. Hand off to a review agent

Launch **one** `Agent` call, `subagent_type: general-purpose` (fresh, not `fork` — the reviewer must not inherit your reasoning about the implementation). Its prompt must be self-contained:

- Repo path, branch name, card ID / issue number.
- Instruction to read `.claude/skills/review-card/SKILL.md` and execute it exactly — including launching its own two parallel fresh `general-purpose` reviewers (Agent A: implementation/AC, Agent B: scope/spec-alignment) — and to gather the shared context itself rather than trust anything you summarize about the change.
- It must **not** fix anything, ask the user anything, or commit. It returns the synthesized review-card report (AC checklist with proof, findings by lens, disagreements, verdict).
- It must end its report with exactly one machine-readable line:
  - `RUN-CARD-VERDICT: CLEAN` — every AC checked off with proof, no blocking findings.
  - `RUN-CARD-VERDICT: NEEDS_INPUT — <one-line reason>` — any unchecked AC, blocking finding, or agent disagreement on something material.
  - `RUN-CARD-VERDICT: NO_SUBAGENTS` — if it has no `Agent` tool and can't spawn the two reviewers. In that case, fall back by invoking `review-card` yourself in this session.

Wait for the completion notification; don't poll and don't start reviewing in parallel yourself.

## 4. Report

Relay the review agent's report to the user (it isn't shown to them automatically) — the AC checklist and findings, not a paraphrase that drops the evidence.

- `NEEDS_INPUT`: ping (`<ID> review: <reason>`), present the report, and stop. Don't patch findings yourself — fixing is a separate step the user asks for (same rule as `review-card`).
- `CLEAN`: ping once that it's ready for their manual commit (`<ID> done: all N ACs verified, review clean — ready to commit`), since the run can't finish without them either way. Add the review section to `tasks/<CardID>-todo.md`.

Never declare the card ready for Todo or touch board status — that's a human call.
