# CRITICAL RULES - MUST FOLLOW

## AGENT STATE PROTOCOL

Project session state lives in `agent-state/` (`project-state.md`, `memory.md`, `left-off.md`).

- **Session start:** BEFORE doing anything else, read all three files in `agent-state/`. Continue from where `left-off.md` says we left off. Do not re-ask questions already answered in these files.
- **Milestones:** whenever you complete a feature, make an architectural change, add/remove files, or make an important decision:
  - update `agent-state/project-state.md` (what exists now / architecture)
  - append a dated entry to `agent-state/memory.md` (decisions & why — append-only, never delete)
  - rewrite "Current focus" + "Next steps" in `agent-state/left-off.md`
- **Session end / before compaction:** finalize `agent-state/left-off.md` so a fresh session can continue seamlessly: current task, exact next step, open questions, anything in progress. Update the session log (newest first).
- These files are the source of truth between sessions. A fresh context window + these files = full project state. Never claim ignorance of something recorded there.


## RESPONSES

- Keep responses concise and to the point - unless the user asks otherwise

## PLANNING MODE

- Always ask clarifying questions
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user

## CHANGE / EDIT MODE

- CRITICAL SPEED RULES: Do not and Never spawn a subagent. Execute all file modifications, multi-file architectural migrations, syntax fixes, and local terminal commands inline.


- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check and next build to check code quality


## DATABASE SCHEMA CHANGES

- Whenever you make changes to the database schema, ALWAYS run the drizzle generate and migrate commands
- NEVER run drizzle push!

## TESTING

- Use any testing tools, libraries available to the project for testing your changes
- Never assume your changes simply work, always test!
- If the project does not have any testing tools, scripts, MCP tools, skills, etc. available for testing, ask the user whether testing should be skipped.

## UI DESIGN

- Always follow/reference the UI design system when creating or reviewing components or pages.
- Design System: @DESIGN.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
