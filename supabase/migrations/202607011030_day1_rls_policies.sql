-- Finish Day 1 RLS policies for data intake, mapping, metrics, rules and outputs.

alter table public.data_sources enable row level security;
alter table public.data_mappings enable row level security;
alter table public.metric_catalog enable row level security;
alter table public.org_metric_config enable row level security;
alter table public.metric_observations enable row level security;
alter table public.formula_definitions enable row level security;
alter table public.recommendation_templates enable row level security;
alter table public.recommendation_rules enable row level security;
alter table public.impact_records enable row level security;
alter table public.execution_tasks enable row level security;
alter table public.alert_rules enable row level security;

drop policy if exists metric_catalog_read on public.metric_catalog;
create policy metric_catalog_read on public.metric_catalog for select to authenticated using (active = true or public.vcpc_is_staff());
drop policy if exists metric_catalog_staff_write on public.metric_catalog;
create policy metric_catalog_staff_write on public.metric_catalog for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());

drop policy if exists recommendation_templates_read on public.recommendation_templates;
create policy recommendation_templates_read on public.recommendation_templates for select to authenticated using (active = true or public.vcpc_is_staff());
drop policy if exists recommendation_templates_staff_write on public.recommendation_templates;
create policy recommendation_templates_staff_write on public.recommendation_templates for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());

drop policy if exists data_sources_read on public.data_sources;
create policy data_sources_read on public.data_sources for select to authenticated using (public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());
drop policy if exists data_sources_write on public.data_sources;
create policy data_sources_write on public.data_sources for all to authenticated using (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer()) with check (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());

drop policy if exists data_mappings_read on public.data_mappings;
create policy data_mappings_read on public.data_mappings for select to authenticated using (public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());
drop policy if exists data_mappings_write on public.data_mappings;
create policy data_mappings_write on public.data_mappings for all to authenticated using (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer()) with check (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());

drop policy if exists org_metric_config_read on public.org_metric_config;
create policy org_metric_config_read on public.org_metric_config for select to authenticated using (public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff());
drop policy if exists org_metric_config_write on public.org_metric_config;
create policy org_metric_config_write on public.org_metric_config for all to authenticated using (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff()) with check (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff());

drop policy if exists metric_observations_read on public.metric_observations;
create policy metric_observations_read on public.metric_observations for select to authenticated using (public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());
drop policy if exists metric_observations_write on public.metric_observations;
create policy metric_observations_write on public.metric_observations for all to authenticated using (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer()) with check (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());

drop policy if exists formula_definitions_read on public.formula_definitions;
create policy formula_definitions_read on public.formula_definitions for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff());
drop policy if exists formula_definitions_write on public.formula_definitions;
create policy formula_definitions_write on public.formula_definitions for all to authenticated using (public.vcpc_is_staff() or (organization_id is not null and public.vcpc_can_manage_org(organization_id))) with check (public.vcpc_is_staff() or (organization_id is not null and public.vcpc_can_manage_org(organization_id)));

drop policy if exists recommendation_rules_read on public.recommendation_rules;
create policy recommendation_rules_read on public.recommendation_rules for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff());
drop policy if exists recommendation_rules_write on public.recommendation_rules;
create policy recommendation_rules_write on public.recommendation_rules for all to authenticated using (public.vcpc_is_staff() or (organization_id is not null and public.vcpc_can_manage_org(organization_id))) with check (public.vcpc_is_staff() or (organization_id is not null and public.vcpc_can_manage_org(organization_id)));

drop policy if exists alert_rules_read on public.alert_rules;
create policy alert_rules_read on public.alert_rules for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff());
drop policy if exists alert_rules_write on public.alert_rules;
create policy alert_rules_write on public.alert_rules for all to authenticated using (public.vcpc_is_staff() or (organization_id is not null and public.vcpc_can_manage_org(organization_id))) with check (public.vcpc_is_staff() or (organization_id is not null and public.vcpc_can_manage_org(organization_id)));

drop policy if exists impact_records_read on public.impact_records;
create policy impact_records_read on public.impact_records for select to authenticated using (public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());
drop policy if exists impact_records_write on public.impact_records;
create policy impact_records_write on public.impact_records for all to authenticated using (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer()) with check (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());

drop policy if exists execution_tasks_read on public.execution_tasks;
create policy execution_tasks_read on public.execution_tasks for select to authenticated using (public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());
drop policy if exists execution_tasks_write on public.execution_tasks;
create policy execution_tasks_write on public.execution_tasks for all to authenticated using (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer()) with check (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff() or public.vcpc_is_platform_reviewer());
