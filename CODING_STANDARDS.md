# Coding Standards

Repo-level standards for review. Rules are written to be cited per hunk.
Lines marked **[hard]** are bright lines — a violation is a hard fail, not a
judgement call. Everything else is a guideline; flag deviations but weigh
context. Skip anything a linter/formatter/type-checker already enforces.

## Design & structure
- Prefer deep modules: substantial behaviour behind a small, stable interface.
- Put new logic at the highest sensible seam; reuse an existing seam over adding one. Fewer seams is better.
- Favour loose coupling — a change in one component shouldn't ripple into others.
- No clever tricks, needless abstraction, or premature generalization. Solve the problem at hand; leave room to grow, don't build for it now.
- Names carry intent. Code should read without a guide.

## Change discipline
- A change touches only what the task requires. Unrelated edits, drive-by refactors, and reformatting belong in separate changes.
- Fix root causes, not symptoms. **[hard]** No commented-out code, no `TODO`-as-fix, no swallow-and-move-on placeholders shipped as the solution.

## Security
- **[hard]** No hardcoded secrets, keys, or tokens. Read from env/secret manager.
- **[hard]** No secrets, credentials, or PII in logs.
- **[hard]** No SQL built by string interpolation — parameterized queries / prepared statements only.
- Validate and sanitize all external input at the boundary. Whitelist expected shapes over blacklisting bad ones.
- Encode/escape on output per sink (HTML, shell, SQL).
- Authorize every protected action, not just authenticate. Fail closed on error or ambiguity.
- Least privilege by default — grant the minimum, widen deliberately.

## Data integrity
- **[hard]** Multi-step writes that must succeed or fail together run in one transaction — no half-applied state.
- Protect read-modify-write sequences against concurrent writers (locking, atomic ops, or optimistic concurrency). Make retry-able operations idempotent.
- Enforce invariants at the data layer (constraints, FKs, NOT NULL, unique) — not only in app code.
- Migrations are reversible or ship with a tested recovery path. Prefer backward-compatible, staged changes (expand → migrate → contract).

## Error handling & observability
- **[hard]** No swallowed errors. A caught exception is logged with enough context to diagnose, or rethrown — never silently dropped.
- Surface failures so they're visible and traceable. An error message says what broke and what to do next.
- Log at boundaries and decisions (requests, external calls, state changes, errors), structured and queryable, with correlation/trace context.
- Any new path that can fail in production must be observable — if it fails, someone can see it without a repro.

## Testing
- New behaviour is covered by tests; changed behaviour has its tests updated.
- Test observable behaviour, not implementation details — tests should survive a reasonable refactor.
- Cover failure and edge cases (empty, boundary, malformed, error paths), not just the happy path.
- Tests are deterministic — no reliance on timing, ordering, or external state unless that's what's under test.

## Dependencies
- New or upgraded dependencies must be justified and checked for known vulnerabilities. Pin versions.
- Prefer the existing stack and stable, proven libraries over trendy ones.

## Documentation
- Non-trivial decisions leave an ADR (`docs/decisions/`): Context → Decision → Consequences, including what was rejected and why.
- Docs capture the *why* and the tradeoffs, not a narration of the code. Same "non-trivial" bar as planning — skip trivial changes.
