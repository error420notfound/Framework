# Verified Notion tracking

Project: https://app.notion.com/p/3fbea1d994558141bf50fbbfdd09dd3f

Plan: https://app.notion.com/p/3fbea1d994558170b259ea4bb45b151f

Projects source: `c383355f-2d45-4fa4-983b-d088fbcc77f4`; Tasks source: `24fdb8a3-d7a5-42a1-8c97-fa33e0830655`.

Verified Status options: Not started / In progress / Done. Kind options: Action / Group / Milestone. Groups are excluded from progress; twelve Action children count. No schedule or estimate is committed.

| Stage | Group ID                         | Action IDs (in delivery order)                                     |
| ----- | -------------------------------- | ------------------------------------------------------------------ |
| 1     | 3fbea1d9945581d69f23edb2f40d06f0 | 3fbea1d9945581f287a2f0d5ea4e93b5; 3fbea1d994558138bd24fa0ca0cadd80 |
| 2     | 3fbea1d99455818da874ec11e4cb5fac | 3fbea1d994558198bf32edaf72b05768; 3fbea1d9945581b5abbfc8e9ee5ef380 |
| 3     | 3fbea1d9945581588ac2feec45cd255a | 3fbea1d9945581b5a5b1e3876feddd41; 3fbea1d9945581e7bd49dc77eb98fc59 |
| 4     | 3fbea1d99455814ba3b8d724c94137fa | 3fbea1d9945581618bb4fa49b62c8df3; 3fbea1d9945581d5b7c4d14836c9b811 |
| 5     | 3fbea1d9945581a28ca1f1163059295f | 3fbea1d9945581f09403d8eed4e35d60; 3fbea1d99455811bbf8dddf13621d45b |
| 6     | 3fbea1d9945581b1a266d2820b01ed11 | 3fbea1d9945581cfb78bee2b9b6e5797; 3fbea1d9945581b98afec79ef59777fc |

Confirmed final sync: all twelve existing Actions have evidence; eleven are Done and the release/migrations/device-budget Action is In progress. Groups 1-5 are Done; Group 6 and the project remain In progress. A read-only grouped query verified these counts. Activity record: https://app.notion.com/p/3fbea1d99455818faf1dedd561be9a81. Local implementation commit: aa1789e. No duplicate project/backlog pages, estimates or schedules were created. Pending writes: none.

## Authoring refinement tracker — verified 2026-10-17

Workstream: https://app.notion.com/p/3fbea1d9945581439d8dfa420fe3a70b (Kind Group, Done).

| Action | ID | Status |
| --- | --- | --- |
| R1–R2 Selection/context and hierarchy | 3fbea1d9945581949c54c7382396db84 | Done |
| R3–R5 Inspector/provenance/dependencies | 3fbea1d9945581378025df4cf9549582 | Done |
| R6–R8 Colour/proportions/naming | 3fbea1d9945581c1a27dd2284466dd5c | Done |
| Regression/persistence/Astro verification | 3fbea1d994558189825cd0f1c16bba42 | Done |

Every Action relates to the existing Formwork project and the refinement Group, links the refinement specification and has acceptance criteria plus changed-file/test evidence. The refinement specification and project received appended checkpoints; requirements and original completion history were retained. Read-back verified the four Actions and Group are Done. The project and original release/migration/device-budget Action remain In progress. The Tasks query now contains fifteen Done Actions and one In progress Action, six Done Groups and one In progress Group. No original task was reopened; no duplicate refinement task was created.

Final evidence: 40 model tests, 58 browser tests passed plus 2 intentional parity-matrix skips, editor and three generated Astro routes build, required desktop/narrow screenshots inspected. Changes remain uncommitted on main based on 9a04544; nothing pushed or deployed. Pending Notion writes: none.

## Starter expansion tracker — 2026-10-17

Specification: https://app.notion.com/p/3fcea1d99455811f9ba3e9616c4b37f7

Workstream (Group, In progress): https://app.notion.com/p/3fcea1d9945581608997ed1880791498

| Batch Action | ID | Status |
| --- | --- | --- |
| A — Registration, presets and additive installation | 3fcea1d99455814bae9edef280373ef3 | Done |
| B — Core editable families | 3fcea1d9945581dfa9feecf42384bcd9 | Done |
| C — Interactive editable families | 3fcea1d994558124851ccc2abfcc0c2e | Not started |
| D — Compositions | 3fcea1d9945581b49e13d9a580d72a8d | Not started |
| E — Chart authoring | 3fcea1d99455811aa9abd01093ea4f92 | Not started |

Schema and existing project tasks were fetched before creating this single workstream/five Actions. Each Action relates to the existing project and expansion Group, links the specification and has batch acceptance criteria. A/B were marked In progress when started, then Done after executed checks; actual implementation/evidence/limits were appended to both Actions and the expansion specification. No estimates/dates were set. Original completed implementation/refinement tasks and the outstanding release/migration/device-budget Action were untouched. Expansion/project remain In progress. Current evidence: 47 model tests, editor/four-route Astro builds, stable full 24-test Brave/Chromium run and final focused four-test expansion pass. Firefox/WebKit expansion checks remain unverified. Source revision, limitations and the exact next Batch C item are recorded on the spec. No push/deployment. Pending Notion writes: none after read-back verification.
