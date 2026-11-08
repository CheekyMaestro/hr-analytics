CREATE TABLE employees (
  employee_id      text PRIMARY KEY CHECK (employee_id ~ '^EMP[0-9]{4}$'),
  full_name        text NOT NULL,
  department_code  text NOT NULL REFERENCES departments(code),
  job_level        text NOT NULL CHECK (job_level IN ('Operator','Staff','Supervisor','Superintendent','Manager')),
  hire_date        date NOT NULL,
  base_salary_idr  bigint NOT NULL CHECK (base_salary_idr > 0),
  employment_type  text NOT NULL CHECK (employment_type IN ('PKWT','PKWTT'))
);
--> statement-breakpoint
CREATE INDEX idx_employees_department ON employees (department_code);
--> statement-breakpoint
CREATE TABLE employee_months (
  employee_id      text NOT NULL REFERENCES employees(employee_id),
  month            date NOT NULL CHECK (extract(day FROM month) = 1),
  department_code  text NOT NULL REFERENCES departments(code),
  work_days        smallint NOT NULL CHECK (work_days BETWEEN 1 AND 31),
  absent_days      smallint NOT NULL CHECK (absent_days >= 0),
  overtime_hours   numeric(6,2) NOT NULL CHECK (overtime_hours >= 0),
  ot_imputed       boolean NOT NULL DEFAULT false,
  left_this_month  boolean NOT NULL,
  ot_cost_idr      bigint NOT NULL CHECK (ot_cost_idr >= 0),
  ot_hours_3m_avg  numeric(6,2) NOT NULL,
  ot_bucket        text NOT NULL CHECK (ot_bucket IN ('le20','20to40','gt40')),
  months_to_exit   smallint CHECK (months_to_exit >= 0),
  is_stayer        boolean NOT NULL,
  run_id           uuid NOT NULL REFERENCES dq_runs(id),
  PRIMARY KEY (employee_id, month),
  CONSTRAINT ck_employee_months_absent CHECK (absent_days <= work_days),
  CONSTRAINT ck_employee_months_exit CHECK (NOT left_this_month OR months_to_exit = 0)
);
--> statement-breakpoint
CREATE INDEX idx_employee_months_month_dept ON employee_months (month, department_code);
--> statement-breakpoint
CREATE INDEX idx_employee_months_exit ON employee_months (months_to_exit) WHERE months_to_exit IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_employee_months_one_exit ON employee_months (employee_id) WHERE left_this_month;
