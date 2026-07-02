-- Seed recommendation templates, formula definitions, and alert rules.

insert into public.recommendation_templates
(template_code, product, industry, title_template, description_template, default_priority, default_owner_role, default_deadline_days, payload, active)
values
('reduce_marketing_waste','both','general','Tối ưu ngân sách marketing','Rà soát hiệu quả từng kênh, giảm phần CAC cao và tái phân bổ sang kênh/retention hiệu quả hơn.','HIGH','CMO/CFO',30,'{}'::jsonb,true),
('improve_branch_utilization','both','general','Cải thiện công suất chi nhánh','Kiểm tra lịch hẹn, nhân sự, funnel địa phương và năng lực khai thác mặt bằng để kéo công suất lên ngưỡng mục tiêu.','HIGH','COO/Operations',60,'{}'::jsonb,true),
('optimize_sga','bizhealth','general','Tối ưu SG&A','Tách chi phí cố định/biến đổi, rà soát các khoản SG&A đang ăn mòn EBITDA.','MEDIUM','CFO',45,'{}'::jsonb,true),
('improve_retention','both','general','Tăng tỷ lệ giữ chân khách hàng','Thiết kế chăm sóc sau bán, nhắc lịch, loyalty/referral và đo repeat rate.','MEDIUM','Growth/CRM',60,'{}'::jsonb,true),
('cashflow_control','bizhealth','general','Kiểm soát dòng tiền và vốn lưu động','Theo dõi cash runway, công nợ, tồn kho và các khoản phải trả/phải thu để tránh căng dòng tiền.','MEDIUM','CFO/Kế toán',30,'{}'::jsonb,true),
('inventory_optimization','strategy_os','retail','Tối ưu tồn kho/SKU','Phân loại SKU bán nhanh/chậm, tối ưu tồn kho và kế hoạch nhập hàng.','MEDIUM','Merchandising/Operations',30,'{}'::jsonb,true),
('competitor_response_plan','strategy_os','general','Kế hoạch phản ứng với động thái đối thủ','Phân tích tín hiệu thị trường/đối thủ và tạo action cụ thể cho giá, sản phẩm, chi nhánh hoặc marketing.','MEDIUM','CEO/Strategy',14,'{}'::jsonb,true)
on conflict (template_code, product, industry) do update set
  title_template = excluded.title_template,
  description_template = excluded.description_template,
  default_priority = excluded.default_priority,
  default_owner_role = excluded.default_owner_role,
  default_deadline_days = excluded.default_deadline_days,
  active = true,
  updated_at = public.vcpc_now_ms();

insert into public.formula_definitions
(formula_code, formula_name, product, industry, input_metrics, formula_logic, assumptions, output_metric_code, active)
select 'marketing_savings_base','Ước tính tiết kiệm marketing','bizhealth','general','{revenue,marketing_cost_pct_revenue}',
  '{"type":"delta_pct_of_revenue","formula":"revenue * (current_marketing_pct - target_marketing_pct)"}'::jsonb,
  '{"editable":true,"note":"Admin chỉnh target % theo ngành và giai đoạn tăng trưởng."}'::jsonb,
  'ebitda', true
where not exists (select 1 from public.formula_definitions where formula_code='marketing_savings_base' and organization_id is null and engagement_id is null);

insert into public.formula_definitions
(formula_code, formula_name, product, industry, input_metrics, formula_logic, assumptions, output_metric_code, active)
select 'branch_utilization_recovery','Ước tính thu hồi doanh thu từ công suất chi nhánh','bizhealth','general','{branch_revenue,branch_utilization}',
  '{"type":"utilization_gap","formula":"current_branch_revenue * utilization_gap * gross_margin_pct"}'::jsonb,
  '{"editable":true,"note":"Dùng cho chuỗi nhiều chi nhánh."}'::jsonb,
  'ebitda', true
where not exists (select 1 from public.formula_definitions where formula_code='branch_utilization_recovery' and organization_id is null and engagement_id is null);

insert into public.formula_definitions
(formula_code, formula_name, product, industry, input_metrics, formula_logic, assumptions, output_metric_code, active)
select 'sga_reduction_base','Ước tính cải thiện SG&A','bizhealth','general','{revenue,sga_cost_pct_revenue}',
  '{"type":"delta_pct_of_revenue","formula":"revenue * (current_sga_pct - target_sga_pct)"}'::jsonb,
  '{"editable":true,"note":"Không tự động khuyến nghị cắt chi phí nếu thiếu phân tích vận hành."}'::jsonb,
  'ebitda', true
where not exists (select 1 from public.formula_definitions where formula_code='sga_reduction_base' and organization_id is null and engagement_id is null);

insert into public.formula_definitions
(formula_code, formula_name, product, industry, input_metrics, formula_logic, assumptions, output_metric_code, active)
select 'inventory_release_base','Ước tính giải phóng vốn từ tồn kho','bizhealth','general','{inventory_days,cogs}',
  '{"type":"working_capital_release","formula":"cogs_per_day * (current_inventory_days - target_inventory_days)"}'::jsonb,
  '{"editable":true,"note":"Chỉ áp dụng khi có COGS và tồn kho đủ tin cậy."}'::jsonb,
  'cash_balance', true
where not exists (select 1 from public.formula_definitions where formula_code='inventory_release_base' and organization_id is null and engagement_id is null);

insert into public.formula_definitions
(formula_code, formula_name, product, industry, input_metrics, formula_logic, assumptions, output_metric_code, active)
select 'retention_uplift_base','Ước tính tăng trưởng từ giữ chân khách hàng','strategy_os','general','{revenue,repeat_rate}',
  '{"type":"retention_uplift","formula":"revenue * repeat_rate_delta * contribution_margin"}'::jsonb,
  '{"editable":true,"note":"Dùng cho BizOS khi có dữ liệu repeat/CRM."}'::jsonb,
  'revenue', true
where not exists (select 1 from public.formula_definitions where formula_code='retention_uplift_base' and organization_id is null and engagement_id is null);

insert into public.alert_rules (organization_id, engagement_id, rule_code, product, industry, metric_code, rule_name, condition_logic, severity, notify_channels, owner_role, active)
select null, null, 'marketing_pct_high', 'both', 'general', 'marketing_cost_pct_revenue', 'Marketing vượt ngưỡng doanh thu', '{"operator":">","threshold":45,"period":"latest","unit":"percent"}'::jsonb, 'HIGH', '{dashboard,email}', 'CMO/CFO', true
where not exists (select 1 from public.alert_rules where rule_code='marketing_pct_high' and organization_id is null and engagement_id is null);

insert into public.alert_rules (organization_id, engagement_id, rule_code, product, industry, metric_code, rule_name, condition_logic, severity, notify_channels, owner_role, active)
select null, null, 'branch_utilization_low', 'both', 'general', 'branch_utilization', 'Công suất chi nhánh thấp', '{"operator":"<","threshold":50,"period":"latest","unit":"percent","dimension_required":"branch"}'::jsonb, 'HIGH', '{dashboard,email}', 'Operations', true
where not exists (select 1 from public.alert_rules where rule_code='branch_utilization_low' and organization_id is null and engagement_id is null);

insert into public.alert_rules (organization_id, engagement_id, rule_code, product, industry, metric_code, rule_name, condition_logic, severity, notify_channels, owner_role, active)
select null, null, 'revenue_drop_wow', 'strategy_os', 'general', 'revenue', 'Doanh thu giảm mạnh tuần qua', '{"operator":"decrease_percent","threshold":15,"comparison":"week_over_week"}'::jsonb, 'HIGH', '{dashboard,email,zalo}', 'CEO/Manager', true
where not exists (select 1 from public.alert_rules where rule_code='revenue_drop_wow' and organization_id is null and engagement_id is null);

insert into public.alert_rules (organization_id, engagement_id, rule_code, product, industry, metric_code, rule_name, condition_logic, severity, notify_channels, owner_role, active)
select null, null, 'inventory_days_high', 'both', 'general', 'inventory_days', 'Ngày tồn kho vượt ngưỡng', '{"operator":">","threshold":75,"period":"latest","unit":"days"}'::jsonb, 'MEDIUM', '{dashboard,email}', 'Operations/Merch', true
where not exists (select 1 from public.alert_rules where rule_code='inventory_days_high' and organization_id is null and engagement_id is null);

insert into public.alert_rules (organization_id, engagement_id, rule_code, product, industry, metric_code, rule_name, condition_logic, severity, notify_channels, owner_role, active)
select null, null, 'cash_runway_low', 'both', 'general', 'cash_runway_days', 'Runway tiền mặt thấp', '{"operator":"<","threshold":45,"period":"latest","unit":"days"}'::jsonb, 'HIGH', '{dashboard,email,zalo}', 'CEO/CFO', true
where not exists (select 1 from public.alert_rules where rule_code='cash_runway_low' and organization_id is null and engagement_id is null);

insert into public.alert_rules (organization_id, engagement_id, rule_code, product, industry, metric_code, rule_name, condition_logic, severity, notify_channels, owner_role, active)
select null, null, 'review_rating_low', 'strategy_os', 'general', 'review_rating', 'Điểm review giảm dưới ngưỡng', '{"operator":"<","threshold":4.0,"period":"latest","unit":"score"}'::jsonb, 'HIGH', '{dashboard,email}', 'Ops/Marketing', true
where not exists (select 1 from public.alert_rules where rule_code='review_rating_low' and organization_id is null and engagement_id is null);
