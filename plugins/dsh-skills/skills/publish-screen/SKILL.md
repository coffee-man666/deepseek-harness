---
name: "publish-screen"
description: "Screen a repository for sensitive information before or after making it public: tracked content, file and directory paths, git history, identity terms, credential patterns; fix by scrubbing, fresh-history rebuild, or going private."
status: proposal
version: "0.4.0"
date: "2026-08-22"
---

# Publish Screen

A clean working tree proves nothing. Public exposure covers **tracked content, file and directory names, and every historical commit** — three separate surfaces, each needing its own proof. Screen all of them before making a repository public, and again after any bulk import of artifacts (session logs, generated reports, workspace dumps), which are the usual leak carriers.

## Scan procedure (all four steps, in order)

1. **Tracked content** — `git grep` over the index (not the filesystem, which drags in node_modules and scratch files):
   - credential patterns: `sk-…`, `ghp_…`, `github_pat_…`, `AKIA…`, `AIza…`, `xox[bap]-…`, `glpat-…`, `sk-ant-…`, long `Bearer …`
   - identity terms: the operator's username(s), real name, personal email domains (gmail/outlook/qq/163/icloud)
   - absolute home paths: `/Users/<name>`, `/home/<name>`
2. **Tracked paths** — `git ls-files | grep` the identity terms. Directory names encode data too: session stores and caches often normalize the working directory into the path itself, and content-only scrubs leave the directory name behind.
3. **History** — `git log --all -p | grep` the same patterns. Deleted files, earlier versions, and force-push survivors are all publicly readable by SHA until rewritten; count `git rev-list --all --count` first to know what a rewrite would cost.
4. **Fork scoping** — for forks of upstream projects, re-run the scan restricted to your own commits (`git log --all -p --author=<you>`). Upstream test fixtures and paths in upstream commits are upstream's content, not your leak; your exposure is only the commits you added.

## False-positive triage

A hit is real only if it names the operator or carries a working credential. Common benign hits:

- placeholder fixtures: `sk-xxx…`, `AKIAIOSFODNN7EXAMPLE`, alphabet keys, `redactSecrets` tests
- npm/pnpm lockfile `sha512-…` integrity hashes (match base64-ish credential patterns)
- test-fixture personas (`/Users/alice`, example.com URLs)
- `.env.example` files and docs telling users where to put keys
- product names that happen to contain a username fragment

## Fix procedures

- **Content**: scrub with `sed` across tracked text files (e.g. `/Users/<name>` → `~`), commit.
- **Paths**: `git mv` the directories to neutral names; verify with `git ls-files` again.
- **History (own small repos)**: rebuild as a fresh single-commit history and force-push, then verify old SHAs return 404. Viable when every commit is yours and recent.
- **History (shared or large repos)**: `git filter-repo` targeted at the affected files, or a GitHub Support purge request; coordinate with collaborators before rewriting.
- **Emergency containment**: `gh repo edit <repo> --visibility private --accept-visibility-change-consequences` FIRST, then clean, then republish. Making a repo private also unpublishes GitHub Pages on free plans.
- **Publishing an export**: never push a working tree. `git archive <branch> | tar -x` into a fresh repository, commit under a noreply identity (`<id>+<login>@users.noreply.github.com`), screen the fresh tree once more, then publish.

## Rules

- Screen before first publication and after every bulk artifact import; re-screen the whole repo when adding generated content.
- Clean tree, clean paths, clean history are three independent proofs — report all three counts, never one as a summary of the others.
- Fixes that rewrite history or flip visibility need the owner's explicit go-ahead; report findings with per-repo fix options instead of acting unilaterally.
- Record what was scanned (patterns, scopes, exclusions) wherever the scan result is claimed, so a "clean" verdict is auditable.
