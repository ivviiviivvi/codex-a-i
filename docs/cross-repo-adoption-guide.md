# Cross-Repository Adoption Guide

This guide outlines how to apply the Codex tooling, workflows, and process expectations across all repositories you participate in. Use it as a checklist when onboarding a new project or refreshing an existing one.

## Suggested Application Strategy Across Repositories

1. **Assess repository maturity**
   - Inventory existing automation (CI, linting, release tooling) and note gaps compared to Codex standards.
   - Confirm language/toolchain compatibility with the Codex CLI, sandbox, and agents.
2. **Align on contribution workflows**
   - Adopt shared conventions for branching, commit messages, and PR descriptions so that tooling and collaborators have consistent expectations.
   - Add or update the repository's `AGENTS.md` (or equivalent instructions file) to highlight repo-specific rules Codex agents must follow.
3. **Roll out shared automation**
   - Install the Codex GitHub Apps or Actions workflows that enforce linting, testing, and security scanning.
   - Mirror the `.github/workflows/` patterns from this repo, customizing only the matrix/tool versions that differ.
4. **Standardize issue and PR templates**
   - Reuse or adapt the templates in `.github/ISSUE_TEMPLATE/` to capture the same metadata (impact, risk, rollout steps).
   - Include a "Codex readiness" checklist so that new issues capture automation needs early.
5. **Document sandbox constraints**
   - Clearly document limitations such as disabled networking or required environment variables (e.g., `CODEX_SANDBOX_NETWORK_DISABLED=1`).
   - Provide fallback instructions for tests that cannot run inside the sandbox.
6. **Close the loop**
   - Track follow-up tasks in the dedicated issue template so adopters confirm completion.
   - Schedule periodic audits (quarterly/biannual) to ensure guidance stays current.

## Templates & Instruction Files

- **Issue template**: Use `.github/ISSUE_TEMPLATE/cross-repo-rollout.yml` (included in this commit) when kicking off adoption in a new repository. It captures status, owners, and risks.
- **Instruction files**: For each repository, add or update an `AGENTS.md` in the repo root to explain language-specific nuances, required environment variables, and testing constraints. Link back to this guide so contributors can find the shared baseline.
- **Pull request guidance**: Consider adding a repository-specific PR template that references Codex testing conventions and sandbox expectations.

## So-What?

Consistently applying these patterns reduces friction for maintainers and Codex agents. Teams gain:

- Predictable automation behavior across codebases.
- Faster onboarding for contributors familiar with Codex workflows.
- Reduced risk of regressions thanks to uniform testing and release practices.

## Who Cares?

- **Repository maintainers** who need actionable checklists for adoption.
- **Codex agent operators** who rely on consistent instructions and automation to work efficiently.
- **Stakeholders (PMs, release managers)** tracking rollout progress across multiple properties.

## Future Expansions

- Build a lightweight dashboard summarizing adoption status across repositories using the issue template metadata.
- Add language-specific appendices (e.g., Python, Rust, TypeScript) detailing recommended toolchains and lint/test commands.
- Package the guidance into a starter-kit repository with reusable workflows and configuration presets.
- Introduce automated reminders (via GitHub Actions or chat integrations) that ping maintainers when audit dates are approaching.
