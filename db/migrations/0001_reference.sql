CREATE TABLE departments (
  code        text PRIMARY KEY CHECK (code ~ '^[a-z_]+$'),
  name        text NOT NULL UNIQUE,
  short_code  text NOT NULL UNIQUE CHECK (length(short_code) = 2),
  sort_order  smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE department_aliases (
  alias_normalized text PRIMARY KEY,
  department_code  text NOT NULL REFERENCES departments(code),
  example_raw      text NOT NULL,
  CONSTRAINT ck_department_aliases_norm CHECK (alias_normalized = lower(btrim(regexp_replace(alias_normalized, '\s+', ' ', 'g'))))
);
