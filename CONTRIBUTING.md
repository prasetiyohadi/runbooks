# Contributing to Runbooks

Thank you for helping us make our operations more reliable! This guide sets the standard for how we write runbooks to ensure they are consistent, effective, and safe to use.

## Core Principles

1.  **Actionable**: Every section should tell the user *what to do*. Limit theory; focus on practice.
2.  **Copy-Paste Ready**: Commands should be complete. Use placeholders like `<cluster-name>` clearly.
3.  **Safe**: Always include validation steps (`verify`) before and after critical changes.
4.  **Formatting**: Use Markdown and standard headers.

## 📝 Runbook Structure

Every runbook **MUST** follow this structure (see [`_templates/RUNBOOK_TEMPLATE.md`](./_templates/RUNBOOK_TEMPLATE.md)):

1.  **Overview**: One sentence explaining what this is.
2.  **Standard Deployment**: The "Gold Standard" YAML/Config for production.
3.  **Storage/Scaling**: How to grow it.
4.  **Upgrades**: How to patch it (Minor vs Major).
5.  **Disaster Recovery**: How to restore from backups.
6.  **Troubleshooting**: Common errors and fixes table.

## Deployment Manifests

- Always include the **full** YAML spec for the standard production deployment.
- Annotate key fields (replicas, storage classes, resource limits).

## Style Guide

- **Commands**: Use code blocks with the language set (e.g., `bash`, `psql`).
- **Alerts**: Use GitHub Alerts for warnings:
  > [!WARNING]
  > This operation causes downtime.
- **Variables**: Use angle brackets for user input: `<pod-name>`, `<namespace>`.

## Creating a New Runbook

1.  Create a folder for the component: `mkdir my-component`
2.  Copy the template: `cp _templates/RUNBOOK_TEMPLATE.md my-component/RUNBOOK.md`
3.  Fill in the sections.
4.  Submit a PR.
