import { FINDING_TEMPLATES } from "@/content/findings";
import { OVERTIME_BUCKET_LABEL, ratio } from "./kpi";
import { formatAbsenteeism, formatInt, formatRatio, formatTurnover } from "./format";
import type { AbsenceLeave, DepartmentRow, Finding, OvertimeLeave, Summary } from "@/lib/queries/types";

/** Replace `{key}` placeholders; an unknown key is an error (no silent blanks). */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/g, (_, key: string) => {
    const v = values[key];
    if (v === undefined) throw new Error(`Template value missing: ${key}`);
    return v;
  });
}

const DASH = "–";
const fmtRatio = (v: number | null) => (v === null ? DASH : formatRatio(v));

export type FindingInputs = {
  site: Summary;
  departments: DepartmentRow[];
  overtime: OvertimeLeave;
  absence: AbsenceLeave;
};

/** Fill the 3 finding templates from query results. */
export function findingValues({ site, departments, overtime, absence }: FindingInputs): Record<string, string> {
  const top = departments[0];
  const low = overtime.buckets.find((b) => b.bucket === "le20");
  const high = overtime.buckets.find((b) => b.bucket === "gt40");
  return {
    dept: top?.name ?? DASH,
    dept_ratio: fmtRatio(top ? ratio(top.turnover_pct, site.turnover_monthly_avg_pct) : null),
    dept_turnover: top ? formatTurnover(top.turnover_pct) : DASH,
    dept_absence: top ? formatAbsenteeism(top.absenteeism_pct) : DASH,
    dept_leavers: top ? formatInt(top.leavers) : DASH,
    site_turnover: formatTurnover(site.turnover_monthly_avg_pct),
    site_absence: formatAbsenteeism(site.absenteeism_pct),
    high_label: OVERTIME_BUCKET_LABEL.gt40,
    low_label: OVERTIME_BUCKET_LABEL.le20,
    ot_ratio: fmtRatio(overtime.ratio_high_low),
    high_rate: high ? formatTurnover(high.leave_rate_pct) : DASH,
    high_leavers: high ? formatInt(high.leavers) : DASH,
    high_rows: high ? formatInt(high.rows) : DASH,
    low_rate: low ? formatTurnover(low.leave_rate_pct) : DASH,
    leaver_count: formatInt(absence.leavers.employees),
    leaver_absence: formatAbsenteeism(absence.leavers.absenteeism_pct),
    stayer_count: formatInt(absence.stayers.employees),
    stayer_absence: formatAbsenteeism(absence.stayers.absenteeism_pct),
    absence_ratio: fmtRatio(absence.ratio),
  };
}

export function buildFindings(inputs: FindingInputs): Finding[] {
  const values = findingValues(inputs);
  return FINDING_TEMPLATES.map((t) => ({
    no: t.no,
    title: renderTemplate(t.title, values),
    body: renderTemplate(t.body, values),
    recommendation: renderTemplate(t.recommendation, values),
  }));
}
