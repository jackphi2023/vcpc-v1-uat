# VCPC Market Intelligence implementation foundation

This note converts the VCPC Market Intelligence business spec into implementation rules for the website/admin app and Supabase schema.

## Source spec

- Version: 1.1
- Cadence: daily scan, Sunday synthesis, Monday before 08:00 delivery
- Core idea: FACT-first weekly market intelligence, role-based slices, and evidence-gated recommendations.

## Implemented frontend foundation

### `assets/mi-spec.js`

This file is the frontend-safe source of truth for:

1. 10 weekly MI content groups.
2. Evidence levels ①–④.
3. Industry tiers A/B/C and output ceilings.
4. 9 alert archetypes.
5. Monday report role slices.
6. Hard trust rules.
7. Lightweight evidence classifier.
8. Verification checklist generator.

### `admin/mi.html`

The admin MI console now shows:

- Evidence levels and confidence thresholds.
- Hard trust rules.
- 10 content groups mapped to roles and sources.
- 9 alert archetypes with recipients and actions.
- Monday report slices by CEO, Marketing, Sales/Commercial, BI/Merch/Ops.
- MI item review cards that classify draft signals into ①–④ and show verification steps.

This is still a static/admin foundation. The next step is wiring these cards to Supabase `mi_signals`, `mi_rules`, and `mi_weekly_reports`.

## Supabase migration foundation

### `supabase/migrations/202607010940_market_intelligence_spec_foundation.sql`

The migration adds:

- Extended fields on existing `mi_items` for structured MI.
- `mi_content_groups`
- `mi_evidence_levels`
- `mi_industry_tiers`
- `mi_alert_archetypes`
- `mi_report_slices`
- `mi_trust_rules`
- `mi_rules`
- `mi_sources`
- `mi_signals`
- `mi_weekly_reports`
- `mi_accuracy_log`

It also seeds:

- 10 content groups.
- 4 evidence levels.
- 3 industry tiers.
- 9 alert archetypes.
- 4 Monday report slices.
- 7 hard trust rules.

## Evidence gate logic

A signal may become ① Recommendation only if:

1. At least two independent sources exist.
2. Signal has delta across multiple snapshots.
3. Evidence label is FACT or sourced ESTIMATE.
4. Internal company data does not contradict it.
5. Action is concrete and reversible.
6. Verification steps are available.
7. Tier C or high-risk recommendations require expert sign-off.

Otherwise the engine should downgrade to:

- ② Consideration
- ③ Monitoring
- ④ Data gap

## User-facing principle

Do not show all MI as advice. Show four separate blocks:

1. Facts observed.
2. Interpretation / hypothesis.
3. Recommendation / action only when evidence gate passes.
4. Data gaps and how to verify.

## Next implementation steps

1. Apply the Supabase migration manually in SQL Editor if connector apply fails.
2. Wire admin MI actions to insert/update `mi_signals`.
3. Add report builder that creates `mi_weekly_reports` every Sunday.
4. Add client dashboard module that reads only published report slices.
5. Add accuracy tracking update UI for weekly backtest.

## Production cautions

- Never produce competitor revenue/profit as a precise fact unless the source is audited or official.
- Marketplace volume is an estimate; ranking may be fact, volume must be labeled estimate.
- Single-source signals cannot become recommendations.
- Internal contradiction must downgrade the output.
- Large decisions such as price reset, store closure, legal/compliance, M&A or export-market action require VCPC expert sign-off.
