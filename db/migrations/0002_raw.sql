CREATE TABLE raw_employees (
  source_row      integer PRIMARY KEY,
  employee_id     text,
  full_name       text,
  department      text,
  job_level       text,
  hire_date       text,
  base_salary     text,
  employment_type text
);
--> statement-breakpoint
CREATE TABLE raw_monthly (
  source_row      integer PRIMARY KEY,
  employee_id     text,
  month           text,
  department      text,
  work_days       text,
  absent_days     text,
  overtime_hours  text,
  left_this_month text
);
