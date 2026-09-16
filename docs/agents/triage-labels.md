# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the strings used in
this repo's issue tracker. Because issues are markdown files (see `issue-tracker.md`), these are the allowed
values of the `Status:` line near the top of each issue file, not GitHub labels.

| Label in mattpocock/skills | Status value in our tracker | Meaning                                                                          |
| -------------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| `needs-triage`             | `needs-triage`              | Maintainer needs to evaluate this issue                                          |
| `needs-info`               | `needs-info`                | Waiting on reporter for more information                                         |
| `ready-for-agent`          | `spec-complete`             | Traces to a spec and ADR; can be implemented with no further decisions           |
| `ready-for-human`          | `needs-decision`            | Needs a design or architectural call first, usually a new ADR (`Proposed`)       |
| `wontfix`                  | `wontfix`                   | Will not be actioned                                                             |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding string from
the table.

## Why the two renamed values

Decided 16 September 2026. `ready-for-agent` and `ready-for-human` describe who executes a ticket, which is a
tooling detail. `spec-complete` and `needs-decision` describe the state of the ticket in the project's own
terms, so the record reads as project process rather than as a personal workflow. The canonical names were
kept where they are already common open-source vocabulary.
