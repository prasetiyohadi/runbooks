<!-- Copilot / AI agent guidance for contributors working on runbooks -->
# Copilot Instructions — Runbooks Knowledgebase

Purpose: help AI coding agents be immediately productive editing runbooks and templates in this repository.

Summary (what this repo is): This repository stores production-ready operational runbooks and templates (Markdown). There is no compiled code or CI build to run — edits are content and process focused.

Key files/folders (examples):
- _templates/RUNBOOK_TEMPLATE.md — canonical runbook structure and YAML manifest examples.
- _templates/README_TEMPLATE.md — per-component README template.
- CONTRIBUTING.md — project rules: structure, style, and required copy-pasteable commands.
- cnpg/RUNBOOK.md — a full, reference runbook (use as exemplar).

What to do first (discovery):
- Read `CONTRIBUTING.md` to learn required runbook sections and style conventions.
- Use `cnpg/RUNBOOK.md` as the canonical example for structure, command patterns, alert blocks, and manifest snippets.

Editing and authoring rules (concrete, repo-specific):

### Runbook Structure (RUNBOOK.md)
- Every runbook MUST follow the `_templates/RUNBOOK_TEMPLATE.md` structure (Overview, Standard Deployment, Storage, Upgrades, DR, Troubleshooting).
- Provide full, copy-pasteable manifests for the "Standard Deployment" section (don't provide partial snippets only).
- Use angle-bracket placeholders for variables: `<cluster-name>`, `<pod>`, `<namespace>`.
- Commands must include a language tag (e.g., ```bash) and be runnable as-is where plausible.
- Use GitHub-style admonitions for risk/warning blocks (see CONTRIBUTING.md examples):
  > [!WARNING]
  > This operation causes downtime.

### Component Documentation Pattern (CONCEPT.md, WORKSHOP.md, README.md)
Each component folder SHOULD include three complementary files following this established pattern:

**CONCEPT.md** (1,200-1,600 lines) — Comprehensive Theory & Architecture
- 10-15 sections covering concepts, components, and best practices
- Diagrams integrated (ASCII or PNG embedded)
- Code examples showing configuration and usage
- Tables for comparisons (e.g., options, thresholds, architectures)
- Deep explanations of "why" and "how"
- Use cases and real-world scenarios
- Production configuration checklist
- Troubleshooting guides
- Essential kubectl/CLI commands
- Key takeaways and summary

**WORKSHOP.md** (800-1,100 lines) — Hands-On Lab (6 parts, 18 tasks)
- Practical, step-by-step lab replacing theoretical assessment
- 6 sequential parts covering deployment, operations, disaster recovery
- 18 individual tasks with:
  - Clear objective for each task
  - Copy-pasteable commands with language tags
  - Expected output (what success looks like)
  - Verification steps
- 90-120 minutes estimated completion time
- Includes troubleshooting section
- Validation checklist at end
- Common issues & resolutions table

**README.md** (500-600 lines) — Navigation & Quick Reference
- 3 learning paths (Beginner → Intermediate → Advanced)
- Quick reference tables (metrics, thresholds, commands)
- FAQ section (6-8 questions with code examples)
- Essential commands cheatsheet
- Tools comparison tables
- Maturity levels with roadmap
- Links to CONCEPT.md and WORKSHOP.md
- Frequently needed calculations or formulas
- Support contacts and community links

**Assets folder**
- 4-5 PNG diagrams downloaded and integrated
- Reference diagrams in markdown using: `![Description](/runbooks/<component>/assets/diagram.png)`

### Example Directories Following Pattern
- `kubernetes/` — CONCEPT.md, WORKSHOP.md, README.md, assets/
- `security/` — CONCEPT.md, WORKSHOP.md, README.md, assets/
- `observability/` — CONCEPT.md, WORKSHOP.md, README.md, assets/
- `cnpg/` — CONCEPT.md, WORKSHOP.md (following this pattern)

Examples agents should follow when making edits:
- To add a new runbook folder and file (example):

```bash
mkdir my-component
cp _templates/RUNBOOK_TEMPLATE.md my-component/RUNBOOK.md
# edit my-component/RUNBOOK.md and fill in production YAML and checks
```

- If updating an existing runbook, preserve the full manifest block and only change values that are clearly intended (image tags, resource sizes). When in doubt, propose the change in PR description rather than editing silently.

Validation & reviewer guidance (how to make reviewable PRs):
- Include a short PR description that lists:
  - Files changed and a one-line reason
  - Commands that should be executed to validate changes (e.g., `kubectl cnpg status <cluster-name>`)
  - Any risk statements (e.g., "requires operator upgrade")
- Run a local Markdown preview and check code blocks render correctly.

Patterns and notable commands seen in the repo (use these as canonical examples):
- CNPG operations: `kubectl cnpg status <cluster-name>`, `kubectl cnpg psql <cluster-name>`, `kubectl cnpg promote <cluster-name> <pod-name>` — prefer these exact forms when documenting CNPG troubleshooting steps.
- Manifest edits are applied via `kubectl apply -f cluster.yaml` and must include `spec.instances`, `storage.size`, and explicit `resources.requests/limits` for production examples.

Boundaries and what not to change automatically:
- Do not restructure the templates directory or rename `_templates` files without human approval.
- Do not change maintainers/ownership statements — these should be updated only if the PR explains ownership changes.

When referencing files in suggestions or PR text, link to the specific path (e.g., `_templates/RUNBOOK_TEMPLATE.md` or `cnpg/RUNBOOK.md`) and include line examples when necessary.

If you are uncertain about a safety-sensitive change (operator upgrade, major DB version upgrade, backups), create a draft PR and flag maintainers rather than committing a non-trivial modification.

If you add new commands or automation snippets, include an example run and expected output or verification steps.

Contact: follow the repo `CONTRIBUTING.md` for maintainers and PR workflow. Ask for human review on high-risk edits.

---
This file was generated/updated by an AI assistant to summarise discoverable conventions in the repo. Please review and iterate.
