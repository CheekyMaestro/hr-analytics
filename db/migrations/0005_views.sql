CREATE VIEW v_month_department AS
SELECT
  month,
  department_code,
  count(*)                                   AS headcount,
  count(*) FILTER (WHERE left_this_month)    AS leavers,
  sum(absent_days)                           AS absent_days,
  sum(work_days)                             AS work_days,
  sum(overtime_hours)                        AS overtime_hours,
  sum(ot_cost_idr)                           AS ot_cost_idr
FROM employee_months
GROUP BY month, department_code;
