# Day 1.5 — Seed & RLS foundation checklist

This document closes the remaining Day 1 blockers before implementing Day 2 upload/admin intake.

## Goal

Before Day 2 code changes, Supabase must have:

- `metric_catalog` seeded with core BizHealth/BizOS metrics.
- `recommendation_templates` seeded with practical templates.
- `formula_definitions` seeded with impact formulas.
- `alert_rules` seeded with default operational alerts.
- RLS policies for upload/mapping/metric/rule/action tables.

## Files

- `supabase/migrations/202607011010_seed_metric_catalog.sql`
- `supabase/migrations/202607011020_seed_recommendation_alert_formula.sql`
- `supabase/migrations/202607011030_day1_rls_policies.sql`

## Verification SQL

```sql
select count(*) from public.metric_catalog;
select count(*) from public.recommendation_templates;
select count(*) from public.formula_definitions;
select count(*) from public.alert_rules;
```

Expected minimums:

- `metric_catalog >= 25`
- `recommendation_templates >= 7`
- `formula_definitions >= 5`
- `alert_rules >= 6`

Check policies:

```sql
select tablename, count(*) as policy_count
from pg_policies
where schemaname='public'
  and tablename in (
    'metric_catalog','recommendation_templates','data_sources','data_mappings',
    'org_metric_config','metric_observations','formula_definitions',
    'recommendation_rules','alert_rules','impact_records','execution_tasks'
  )
group by tablename
order by tablename;
```

Expected:

- Most tables should have at least 2 policies: read + write.
- `metric_catalog` and `recommendation_templates` should have catalog read + staff write.

## Day 2 readiness

Only start Day 2 after the SQL checks pass.

Day 2 will update:

- `app/upload.html`: save `data_uploads` + `data_sources` + `validation_issues`.
- `admin/data-review.html`: read real upload/data gap data, not static demo.

## Business reason

Without seeded metrics/rules/templates, upload and admin review cannot reliably decide which data is missing or which dashboard modules can be built. The app must treat missing data as a data gap, not as a hard crash.
