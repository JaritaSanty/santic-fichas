# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This workspace (`SanTIC_Education/activity_materials`) will hold a static, bilingual (es/en) Next.js app that generates printable classroom worksheets (word search, crossword, arithmetic). No source code exists yet: the approved design is in [docs/superpowers/specs/2026-09-12-generador-fichas-design.md](docs/superpowers/specs/2026-09-12-generador-fichas-design.md). Read it before any change; it fixes module boundaries, ad placement rules, privacy constraints and the per-phase closing checklist. There are no build/lint/test commands yet. Update this file once scaffolding exists. Commits use Conventional Commits in Spanish.

## Agent tooling present

- **Impeccable** (frontend design skill) is installed for several agents: `.claude/skills/impeccable`, `.agents/skills/impeccable`, `.agent/skills/impeccable`, `.gemini/skills/impeccable`. The Claude Code subagents in `.claude/agents/` (`impeccable-*`) are part of it.
- **Hooks** (`.claude/settings.local.json`): after every `Edit`/`Write`, and again on `Stop`, the hook runs `.claude/skills/impeccable/scripts/impeccable hook`. It runs design checks on UI files, so expect its feedback after you edit HTML/CSS/UI code. Hook consent is recorded in `.impeccable/config.local.json`.
- **CodeGraph** index lives in `.codegraph/`. Once code exists, use `codegraph_explore` (or `codegraph explore "<query>"`) before grep/reading files. Don't edit anything in `.codegraph/`.
