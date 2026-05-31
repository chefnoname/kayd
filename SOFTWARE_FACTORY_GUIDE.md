# Software Factory Guide — Running in VS Code

## Setup (already done)
Your repo has everything in place:
- `CLAUDE.md` at root — permanent memory for all agents
- `.claude/agents/` — 7 agent configs

## How to Use Agents in VS Code Claude

1. Open your Kayd project in VS Code
2. Open Claude Code (Cmd+Shift+P → "Claude Code")
3. Type `/agents` to see the list of available agents
4. Select the agent you want to use
5. Paste your prompt — the agent will follow its scoped instructions

## The Pipeline (follow this order for every ticket)

```
Feature idea
    ↓
Agent 1: Researcher      → maps files, patterns, constraints
    ↓
Agent 2: Story Writer    → user stories + acceptance criteria
    ↓
🚦 CHECKPOINT 1: You approve the stories
    ↓
Agent 3: Spec Writer     → technical brief (DB, API, components, data flow)
    ↓
🚦 CHECKPOINT 2: You approve the spec
    ↓
Agent 4: Backend Builder  → migrations, API routes, types
    ↓
Agent 5: Frontend Builder → pages, components, styles
    ↓
Agent 6: Test Verifier    → writes tests against acceptance criteria
    ↓
Agent 7: Validator        → read-only audit, finds gaps/bugs
    ↓
🚦 CHECKPOINT 3: You approve the PR
```

## What to Paste to Each Agent

### Agent 1: Researcher
```
I need to implement: [describe the feature]
Map all relevant files, trace the data flow, and surface constraints.
```

### Agent 2: Story Writer
```
Based on this research: [paste researcher output or summarise]
Write user stories with acceptance criteria for: [feature]
```

### Agent 3: Spec Writer
```
Approved stories: [paste stories]
Researcher findings: [paste key constraints]
Write a technical implementation brief.
```

### Agent 4: Backend Builder
```
Approved spec: [paste the DB + API sections from the spec]
Build the backend. Provide a Backend API Summary when done.
```

### Agent 5: Frontend Builder
```
Backend API Summary: [paste from backend builder]
Approved spec: [paste the component/UI sections]
Build the frontend.
```

### Agent 6: Test Verifier
```
Original stories: [paste]
Backend API Summary: [paste]
Write tests validating each acceptance criterion.
```

### Agent 7: Validator
```
Stories: [paste]
Spec: [paste]
Compare the implementation against the spec. Report critical/minor issues.
```

## Rules of the Factory

1. **Never skip checkpoints.** The human approves stories and specs before code is written.
2. **Rule of Drift.** If an architectural mistake gets baked in, don't patch mid-session. Revert (`git reset --hard`), update `CLAUDE.md` if needed, and restart the pipeline.
3. **Agents are scoped.** The Researcher and Validator are read-only. Builders only touch their domain.
4. **Context flows forward.** Each agent's output feeds the next. Don't skip agents — you'll lose context.
5. **Always run migrations first.** Before testing any DB-related changes, run the SQL in Supabase SQL editor.

## When to Come Back to Cowork

- Setting up new agents or modifying agent configs
- Debugging failures that span multiple agents
- Complex multi-ticket work where you want parallel orchestration
- Updating CLAUDE.md with new conventions

## Quick Reference

| Agent | Command | Can Write? | Scope |
|-------|---------|-----------|-------|
| Researcher | `/agents` → researcher | No | Entire repo (read) |
| Story Writer | `/agents` → story-writer | No | Product context |
| Spec Writer | `/agents` → spec-writer | No | Architecture |
| Backend Builder | `/agents` → backend-builder | Yes | `supabase/`, `app/api/`, `lib/`, `middleware.ts` |
| Frontend Builder | `/agents` → frontend-builder | Yes | `app/(auth,dashboard)/`, `components/`, `styles/` |
| Test Verifier | `/agents` → test-verifier | Yes | Test files only |
| Validator | `/agents` → validator | No | Entire repo (read) |
