CREATE TABLE dq_runs (
  id              uuid PRIMARY KEY,
  seed            integer,
  git_sha         text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  status          text NOT NULL CHECK (status IN ('running','succeeded','failed')),
  raw_employee_rows integer,
  raw_monthly_rows  integer,
  duplicate_rows    integer,
  clean_monthly_rows integer,
  overtime_null_rows integer,
  department_spellings integer,
  error_message   text
);
--> statement-breakpoint
CREATE INDEX idx_dq_runs_latest ON dq_runs (finished_at DESC) WHERE status = 'succeeded';
--> statement-breakpoint
CREATE TABLE dq_issues (
  run_id         uuid NOT NULL REFERENCES dq_runs(id) ON DELETE CASCADE,
  code           text NOT NULL CHECK (code ~ '^DQ-[0-9]{2}$'),
  table_name     text NOT NULL CHECK (table_name IN ('employees','monthly')),
  column_name    text NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('fix','check')),
  description    text NOT NULL,
  rows_affected  integer NOT NULL CHECK (rows_affected >= 0),
  action         text NOT NULL,
  status         text NOT NULL CHECK (status IN ('diperbaiki','perlu_konfirmasi','lolos','gagal')),
  PRIMARY KEY (run_id, code)
);
--> statement-breakpoint
CREATE TABLE dq_alias_hits (
  run_id          uuid NOT NULL REFERENCES dq_runs(id) ON DELETE CASCADE,
  table_name      text NOT NULL CHECK (table_name IN ('employees','monthly')),
  raw_value       text NOT NULL,
  department_code text NOT NULL REFERENCES departments(code),
  is_canonical    boolean NOT NULL,
  rows            integer NOT NULL CHECK (rows > 0),
  PRIMARY KEY (run_id, table_name, raw_value)
);
