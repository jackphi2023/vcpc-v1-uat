-- VCPC Market Intelligence spec foundation
-- Implements the business spec for weekly MI content, evidence levels,
-- alert archetypes, role-based Monday report slices, verification rules and accuracy tracking.
-- Safe to run repeatedly; all inserts use ON CONFLICT or natural keys.

-- 1) Extend the existing generic MI table so it can store structured signals now.
alter table public.mi_items
  add column if not exists content_group_code text,
  add column if not exists evidence_level integer,
  add column if not exists evidence_label text,
  add column if not exists source_count integer not null default 0,
  add column if not exists has_delta boolean not null default false,
  add column if not exists confidence numeric not null default 50,
  add column if not exists industry_tier text,
  add column if not exists alert_archetype text,
  add column if not exists role_slices text[] not null default '{}',
  add column if not exists verification_steps jsonb not null default '[]'::jsonb,
  add column if not exists fact_summary text,
  add column if not exists interpretation text,
  add column if not exists actionability text,
  add column if not exists reviewer_note text,
  add column if not exists expert_signed_by uuid references auth.users(id),
  add column if not exists expert_signed_at bigint,
  add column if not exists published_for_week date,
  add column if not exists accuracy_status text not null default 'untracked',
  add column if not exists accuracy_note text;

-- 2) Core MI spec catalog.
create table if not exists public.mi_content_groups (
  code text primary key,
  group_no integer not null,
  title text not null,
  primary_roles text[] not null default '{}',
  source_types text[] not null default '{}',
  evidence_label text not null,
  ai_supported boolean not null default true,
  active boolean not null default true,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.mi_evidence_levels (
  level integer primary key,
  code text not null unique,
  label text not null,
  language text not null,
  actionability text not null,
  min_confidence integer not null default 0,
  active boolean not null default true
);

create table if not exists public.mi_industry_tiers (
  tier text primary key,
  industries text[] not null default '{}',
  output_ceiling text not null,
  note text,
  active boolean not null default true
);

create table if not exists public.mi_alert_archetypes (
  code text primary key,
  title text not null,
  trigger_condition text not null,
  recipients text[] not null default '{}',
  default_action text not null,
  severity text not null default 'MEDIUM',
  active boolean not null default true,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.mi_report_slices (
  code text primary key,
  role_name text not null,
  contents text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.mi_trust_rules (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,
  rule_text text not null,
  severity text not null default 'HARD',
  active boolean not null default true,
  created_at bigint not null default public.vcpc_now_ms()
);

-- 3) MI rules and source/signal tracking for BizOS.
create table if not exists public.mi_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  rule_code text not null,
  content_group_code text references public.mi_content_groups(code),
  alert_archetype text references public.mi_alert_archetypes(code),
  industry text not null default 'general',
  industry_tier text references public.mi_industry_tiers(tier),
  rule_name text not null,
  cadence text not null default 'weekly',
  threshold_config jsonb not null default '{}'::jsonb,
  output_policy jsonb not null default '{}'::jsonb,
  reviewer_required boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms(),
  unique (organization_id, engagement_id, rule_code)
);

create table if not exists public.mi_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  source_type text not null default 'web',
  source_name text not null,
  source_url text,
  provider text,
  reliability_tier text,
  access_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.mi_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  mi_rule_id uuid references public.mi_rules(id) on delete set null,
  content_group_code text references public.mi_content_groups(code),
  alert_archetype text references public.mi_alert_archetypes(code),
  signal_type text not null,
  entity_name text,
  title text not null,
  fact_summary text,
  interpretation text,
  source_urls text[] not null default '{}',
  source_count integer not null default 0,
  has_delta boolean not null default false,
  delta_window text,
  evidence_level integer references public.mi_evidence_levels(level),
  evidence_label text,
  confidence numeric not null default 50,
  industry_tier text references public.mi_industry_tiers(tier),
  internal_metric text,
  internal_conflict boolean not null default false,
  verification_steps jsonb not null default '[]'::jsonb,
  suggested_action text,
  owner_role text,
  location text,
  occurred_at bigint,
  status text not null default 'new',
  reviewer_note text,
  expert_signed_by uuid references auth.users(id),
  expert_signed_at bigint,
  created_by uuid references auth.users(id),
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.mi_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  publish_before text not null default 'Monday 08:00',
  status text not null default 'draft',
  executive_summary jsonb not null default '{}'::jsonb,
  role_slices jsonb not null default '{}'::jsonb,
  data_gaps jsonb not null default '[]'::jsonb,
  accuracy_log jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  published_at bigint,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.mi_accuracy_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  mi_signal_id uuid references public.mi_signals(id) on delete set null,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  report_id uuid references public.mi_weekly_reports(id) on delete set null,
  checked_for_week date,
  original_claim text,
  outcome text,
  accuracy_status text not null default 'pending',
  lesson text,
  corrected_rule_code text,
  created_by uuid references auth.users(id),
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

-- 4) Indexes.
create index if not exists mi_items_week_level_idx on public.mi_items(published_for_week, evidence_level, alert_archetype);
create index if not exists mi_rules_org_eng_idx on public.mi_rules(organization_id, engagement_id, active);
create index if not exists mi_sources_org_eng_idx on public.mi_sources(organization_id, engagement_id, active);
create index if not exists mi_signals_org_week_idx on public.mi_signals(organization_id, engagement_id, occurred_at, status);
create index if not exists mi_weekly_reports_org_week_idx on public.mi_weekly_reports(organization_id, engagement_id, week_start, week_end);

-- 5) RLS. Catalogs are readable by signed-in users; staff write. Org-scoped MI data follows organization access.
alter table public.mi_content_groups enable row level security;
alter table public.mi_evidence_levels enable row level security;
alter table public.mi_industry_tiers enable row level security;
alter table public.mi_alert_archetypes enable row level security;
alter table public.mi_report_slices enable row level security;
alter table public.mi_trust_rules enable row level security;
alter table public.mi_rules enable row level security;
alter table public.mi_sources enable row level security;
alter table public.mi_signals enable row level security;
alter table public.mi_weekly_reports enable row level security;
alter table public.mi_accuracy_log enable row level security;

drop policy if exists mi_catalog_read on public.mi_content_groups;
create policy mi_catalog_read on public.mi_content_groups for select to authenticated using (active or public.vcpc_is_staff());
drop policy if exists mi_evidence_read on public.mi_evidence_levels;
create policy mi_evidence_read on public.mi_evidence_levels for select to authenticated using (active or public.vcpc_is_staff());
drop policy if exists mi_tiers_read on public.mi_industry_tiers;
create policy mi_tiers_read on public.mi_industry_tiers for select to authenticated using (active or public.vcpc_is_staff());
drop policy if exists mi_archetypes_read on public.mi_alert_archetypes;
create policy mi_archetypes_read on public.mi_alert_archetypes for select to authenticated using (active or public.vcpc_is_staff());
drop policy if exists mi_slices_read on public.mi_report_slices;
create policy mi_slices_read on public.mi_report_slices for select to authenticated using (active or public.vcpc_is_staff());
drop policy if exists mi_trust_read on public.mi_trust_rules;
create policy mi_trust_read on public.mi_trust_rules for select to authenticated using (active or public.vcpc_is_staff());

drop policy if exists mi_catalog_staff_write on public.mi_content_groups;
create policy mi_catalog_staff_write on public.mi_content_groups for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
drop policy if exists mi_evidence_staff_write on public.mi_evidence_levels;
create policy mi_evidence_staff_write on public.mi_evidence_levels for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
drop policy if exists mi_tiers_staff_write on public.mi_industry_tiers;
create policy mi_tiers_staff_write on public.mi_industry_tiers for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
drop policy if exists mi_archetypes_staff_write on public.mi_alert_archetypes;
create policy mi_archetypes_staff_write on public.mi_alert_archetypes for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
drop policy if exists mi_slices_staff_write on public.mi_report_slices;
create policy mi_slices_staff_write on public.mi_report_slices for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
drop policy if exists mi_trust_staff_write on public.mi_trust_rules;
create policy mi_trust_staff_write on public.mi_trust_rules for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());

drop policy if exists mi_rules_read on public.mi_rules;
create policy mi_rules_read on public.mi_rules for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff());
drop policy if exists mi_rules_write on public.mi_rules;
create policy mi_rules_write on public.mi_rules for all to authenticated using ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff()))) with check ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff())));

drop policy if exists mi_sources_read on public.mi_sources;
create policy mi_sources_read on public.mi_sources for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff());
drop policy if exists mi_sources_write on public.mi_sources;
create policy mi_sources_write on public.mi_sources for all to authenticated using ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff()))) with check ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff())));

drop policy if exists mi_signals_read on public.mi_signals;
create policy mi_signals_read on public.mi_signals for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff());
drop policy if exists mi_signals_write on public.mi_signals;
create policy mi_signals_write on public.mi_signals for all to authenticated using ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff()))) with check ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff())));

drop policy if exists mi_reports_read on public.mi_weekly_reports;
create policy mi_reports_read on public.mi_weekly_reports for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff());
drop policy if exists mi_reports_write on public.mi_weekly_reports;
create policy mi_reports_write on public.mi_weekly_reports for all to authenticated using ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff()))) with check ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff())));

drop policy if exists mi_accuracy_read on public.mi_accuracy_log;
create policy mi_accuracy_read on public.mi_accuracy_log for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id) or public.vcpc_is_staff());
drop policy if exists mi_accuracy_write on public.mi_accuracy_log;
create policy mi_accuracy_write on public.mi_accuracy_log for all to authenticated using ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff()))) with check ((organization_id is null and public.vcpc_is_staff()) or (organization_id is not null and (public.vcpc_can_manage_org(organization_id) or public.vcpc_is_staff())));

-- 6) Seed spec catalogs.
insert into public.mi_evidence_levels (level, code, label, language, actionability, min_confidence) values
(1,'recommendation','① Kiến nghị','Nên làm X','Có, cụ thể',75),
(2,'consideration','② Gợi ý cân nhắc','Có thể cân nhắc X, cần kiểm tra Y','Có điều kiện',55),
(3,'monitoring','③ Đang theo dõi','Đang thấy tín hiệu Z, chưa đủ để hành động','Không — gắn cờ',35),
(4,'data_gap','④ Khoảng trống dữ liệu','Chưa đủ dữ kiện; cần dữ liệu X','Không — nêu cái cần',0)
on conflict (level) do update set code=excluded.code, label=excluded.label, language=excluded.language, actionability=excluded.actionability, min_confidence=excluded.min_confidence, active=true;

insert into public.mi_content_groups (code, group_no, title, primary_roles, source_types, evidence_label) values
('top_sku_market',1,'Top SKU/danh mục bán chạy thị trường','{BI,Sales,Merch}','{Metric/Kalodata,Marketplace snapshots,Snapshot delta}','RANKING_FACT_VOLUME_ESTIMATE'),
('competitor_price_promo',2,'Giá & khuyến mãi/voucher đối thủ','{Sales,Merch,CEO}','{Marketplace,Website,App}','FACT'),
('new_store_footprint',3,'Mở cửa hàng/cơ sở mới & footprint','{CEO,Ops,Sales}','{Google Maps/Places,Fanpage}','FACT'),
('marketing_social_spike',4,'Chiến dịch marketing & social spike','{Marketing}','{Fanpage,Social listening,Ads}','FACT_WITH_IMPACT_HYPOTHESIS'),
('pr_funding_ma',5,'PR/báo chí, sự kiện, gọi vốn/M&A','{CEO,Marketing}','{Press,News portals}','FACT'),
('competitor_new_product',6,'Sản phẩm/dịch vụ mới của đối thủ','{CEO,Merch,Marketing}','{Website,Marketplace,Fanpage}','FACT'),
('input_cost_macro_policy',7,'Chi phí đầu vào & vĩ mô/chính sách','{CEO,Ops}','{Customs,Association,GSO,Press}','FACT'),
('demand_search_trend',8,'Xu hướng cầu & từ khoá tìm kiếm','{Marketing,BI}','{Google Trends,Marketplace search}','ESTIMATE'),
('review_sentiment',9,'Review & sentiment thương hiệu/cửa hàng','{Marketing,Ops}','{Maps,Marketplace,Social}','REVIEW_FACT_SCORE_ESTIMATE'),
('geo_competitor_overlay',10,'Overlay bản đồ: đối thủ gần điểm bán','{Ops,Sales,CEO}','{Maps,Internal store data}','FACT')
on conflict (code) do update set group_no=excluded.group_no, title=excluded.title, primary_roles=excluded.primary_roles, source_types=excluded.source_types, evidence_label=excluded.evidence_label, active=true, updated_at=public.vcpc_now_ms();

insert into public.mi_industry_tiers (tier, industries, output_ceiling, note) values
('A','{retail_online,export_agri_aqua,fnb_chain}','recommendation','Mật độ tín hiệu số cao; có thể phát kiến nghị ① nếu qua cổng bằng chứng.'),
('B','{real_estate,spa_beauty,healthcare,education,hotel_travel}','consideration','Chủ yếu ②/③; ① chỉ khi dữ liệu nội bộ đồng thuận và chuyên gia xác nhận.'),
('C','{manufacturing_b2b,distribution,materials,logistics}','monitoring','Chủ yếu ③/④; nội bộ và chuyên gia là nguồn chính.')
on conflict (tier) do update set industries=excluded.industries, output_ceiling=excluded.output_ceiling, note=excluded.note, active=true;

insert into public.mi_alert_archetypes (code, title, trigger_condition, recipients, default_action, severity) values
('price_war','Price war','≥3 đối thủ giảm >X% cùng nhóm trong 3 ngày','{Sales,Merch,CEO}','Rà giá–voucher–tồn–biên trước khi phản ứng giá','HIGH'),
('sku_service_gap','SKU/dịch vụ gap','Đối thủ tăng delta 7 ngày mạnh ở danh mục ta thiếu','{Merch,Marketing}','Đề xuất capsule nhanh / nội dung thay thế','HIGH'),
('geo_competitor_nearby','Geo (đối thủ gần)','Đối thủ mở cơ sở trong bán kính N km quanh điểm bán','{Ops,CEO}','Theo dõi traffic/doanh thu 14 ngày','MEDIUM'),
('stockout_hot','Stockout hot','Hết size/màu/sản phẩm hot ở ta hoặc đối thủ','{Merch,Ops}','Ưu tiên replenishment, điều chuyển kho','MEDIUM'),
('social_spike','Social spike','Tương tác/đơn tăng vọt quanh 1 SKU/đối thủ','{Marketing}','Phân tích hook/creator/offer — không copy','MEDIUM'),
('review_drop','Review drop','Rating < ngưỡng hoặc keyword tiêu cực tăng','{Ops,Area Manager}','Xử lý trong 48h, ghi nhận nguyên nhân','HIGH'),
('cost_spike','Cost spike','Giá đầu vào vượt ngưỡng cấu hình','{CEO,Procurement}','Rà giá vốn / hợp đồng nguồn cung','HIGH'),
('regulatory','Regulatory','Thay đổi thuế/quy định/cấp phép liên quan','{CEO,Legal}','Rà tuân thủ, cập nhật quy trình','HIGH'),
('new_launch_pr','New launch / PR','Đối thủ ra SP mới, lên báo, gọi vốn/M&A','{CEO,Marketing}','Đánh giá tác động chiến lược','MEDIUM')
on conflict (code) do update set title=excluded.title, trigger_condition=excluded.trigger_condition, recipients=excluded.recipients, default_action=excluded.default_action, severity=excluded.severity, active=true, updated_at=public.vcpc_now_ms();

insert into public.mi_report_slices (code, role_name, contents, sort_order) values
('ceo','CEO','{"3 điều chắc chắn nhất","Kiến nghị ①","Cảnh báo Cao","Động thái chiến lược đối thủ"}',1),
('marketing','Marketing','{"Chiến dịch & social spike","Từ khoá/trend","PR","Sentiment thương hiệu"}',2),
('sales_commercial','Sales / Commercial','{"Price war","Voucher","SKU bán chạy cần nhập","Đối thủ mở gần"}',3),
('bi_merch_ops','BI / Merch / Ops','{"SKU-level table","Heatmap danh mục","Stockout","Review","Overlay bản đồ"}',4)
on conflict (code) do update set role_name=excluded.role_name, contents=excluded.contents, sort_order=excluded.sort_order, active=true;

insert into public.mi_trust_rules (rule_code, rule_text, severity) values
('no_single_source_recommendation','Không kiến nghị từ một nguồn duy nhất; không từ một lần quét — phải có delta.','HARD'),
('range_not_fake_precision','Không ghi số tuyệt đối khi nguồn chỉ hiển thị khoảng; dùng khoảng + nhãn ƯỚC TÍNH.','HARD'),
('internal_veto','Không kiến nghị trái dữ liệu nội bộ mà không gắn cờ và hạ cấp.','HARD'),
('tier_c_ceiling','Tầng C không vượt bối cảnh + nội bộ nếu chưa có chuyên gia.','HARD'),
('confidence_downgrade','Confidence thấp hơn ngưỡng thì hạ xuống ③/④, không ép thành ①.','HARD'),
('verification_required','Mỗi kiến nghị phải có nguồn, cách kiểm chứng và điều kiện lật kết luận.','HARD'),
('expert_signoff_for_big_moves','Việc lớn như đổi giá toàn hệ thống/đóng cơ sở/pháp lý/M&A cần chuyên gia ký.','HARD')
on conflict (rule_code) do update set rule_text=excluded.rule_text, severity=excluded.severity, active=true;
