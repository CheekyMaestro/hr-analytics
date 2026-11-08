/**
 * Deterministic dummy-data generator (PRD.md §7, FR-01).
 *
 * Builds the clean "truth" first, calibrates it with seeded local search so the
 * injected patterns land on the design targets in `generator-config.ts`, then
 * adds the documented defects (dirty department spellings, empty overtime,
 * exact duplicates) to produce the two raw tables.
 */
import { fakerID_ID as faker } from "@faker-js/faker";
import { createRng, type Rng } from "./prng";
import {
  ABSENTEEISM_LEAVERS_LAST3,
  ABSENTEEISM_PER_MONTH,
  ABSENTEEISM_STAYERS,
  BUCKET_ROWS,
  DEPTS,
  DUPLICATE_ROWS,
  JOB_LEVELS,
  JOB_MIX_FIELD,
  JOB_MIX_OFFICE,
  LEAVERS_PER_MONTH,
  MONTHS,
  OVERTIME_NULL_ROWS,
  SALARY_BAND,
  SENSITIVITY_RATIO,
  WORK_DAYS_FIELD,
  WORK_DAYS_OFFICE,
  YEAR,
  type JobLevel,
} from "./generator-config";

export type RawEmployeeRow = {
  employee_id: string;
  full_name: string;
  department: string;
  job_level: string;
  hire_date: string;
  base_salary: string;
  employment_type: string;
};

export type RawMonthlyRow = {
  employee_id: string;
  month: string;
  department: string;
  work_days: string;
  absent_days: string;
  overtime_hours: string;
  left_this_month: string;
};

export const EMPLOYEE_COLUMNS = [
  "employee_id",
  "full_name",
  "department",
  "job_level",
  "hire_date",
  "base_salary",
  "employment_type",
] as const;

export const MONTHLY_COLUMNS = [
  "employee_id",
  "month",
  "department",
  "work_days",
  "absent_days",
  "overtime_hours",
  "left_this_month",
] as const;

type Emp = {
  id: string;
  name: string;
  dept: number;
  jobLevel: JobLevel;
  hireDate: string;
  salary: number;
  employmentType: "PKWT" | "PKWTT";
  /** Month index 0–11 of leaving, or null for stayers. */
  leaveMonth: number | null;
  /** Target overtime bucket of the leave month (leavers only). */
  leaveBucket: number | null;
  /** Row indices, ordered by month. */
  rows: number[];
};

type Row = {
  emp: number;
  dept: number;
  m: number;
  work: number;
  absent: number;
  /** Generated overtime value (kept even when the raw cell is emptied). */
  ot: number;
  imputed: boolean;
  left: boolean;
  monthsToExit: number | null;
};

export type GeneratedDataset = {
  employees: RawEmployeeRow[];
  monthly: RawMonthlyRow[];
};

const ID_WIDTH = 4;
/** Overtime level per job level; managerial levels are not eligible for paid overtime. */
const OT_LEVEL_FACTOR: Record<JobLevel, number> = {
  Operator: 1.1,
  Staff: 1,
  Supervisor: 0.75,
  Superintendent: 0,
  Manager: 0,
};
const otEligible = (e: Emp) => OT_LEVEL_FACTOR[e.jobLevel] > 0;
const OT_MAX = 90;

export function generateDataset(seed: number): GeneratedDataset {
  const rng = createRng(seed);
  faker.seed(seed);

  const emps = buildEmployees(rng);
  assignLeavers(rng, emps);
  const rows = buildRows(emps);
  calibrateOvertime(rng, emps, rows);
  calibrateAbsence(rng, emps, rows);
  calibrateSalaries(emps, rows);
  return toRaw(rng, emps, rows);
}

/* ------------------------------------------------------------------ */
/* Employees                                                           */
/* ------------------------------------------------------------------ */

function pickWeighted(rng: Rng, weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i] ?? 0;
    if (r < 0) return i;
  }
  return weights.length - 1;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildEmployees(rng: Rng): Emp[] {
  const deptSlots: number[] = [];
  DEPTS.forEach((d, i) => {
    for (let k = 0; k < d.headcount; k++) deptSlots.push(i);
  });
  rng.shuffle(deptSlots);

  const start = Date.UTC(2012, 0, 1);
  const end = Date.UTC(2024, 11, 31);
  const day = 86_400_000;

  return deptSlots.map((dept, i) => {
    const spec = DEPTS[dept]!;
    const level = JOB_LEVELS[pickWeighted(rng, spec.field ? JOB_MIX_FIELD : JOB_MIX_OFFICE)]!;
    const [lo, hi] = SALARY_BAND[level];
    const salary = Math.round((lo + rng.next() * (hi - lo)) / 1000) * 1000;
    const hire = new Date(start + Math.floor(rng.next() * ((end - start) / day + 1)) * day);
    return {
      id: `EMP${String(i + 1).padStart(ID_WIDTH, "0")}`,
      name: faker.person.fullName(),
      dept,
      jobLevel: level,
      hireDate: isoDate(hire),
      salary,
      employmentType: rng.next() < 0.35 ? "PKWT" : "PKWTT",
      leaveMonth: null,
      leaveBucket: null,
      rows: [],
    };
  });
}

/* ------------------------------------------------------------------ */
/* Leavers: dept × month matrix with fixed margins                     */
/* ------------------------------------------------------------------ */

function deptTurnoverAvg(matrix: number[][], d: number): number {
  const head = DEPTS[d]!.headcount;
  let hc = head;
  let sum = 0;
  for (let m = 0; m < MONTHS; m++) {
    const l = matrix[d]![m]!;
    sum += (100 * l) / hc;
    hc -= l;
  }
  return sum / MONTHS;
}

function assignLeavers(rng: Rng, emps: Emp[]): void {
  // Initial matrix from a shuffled token list, filled month by month.
  const tokens: number[] = [];
  DEPTS.forEach((d, i) => {
    for (let k = 0; k < d.leavers; k++) tokens.push(i);
  });
  rng.shuffle(tokens);
  const matrix = DEPTS.map(() => new Array<number>(MONTHS).fill(0));
  let t = 0;
  LEAVERS_PER_MONTH.forEach((count, m) => {
    for (let k = 0; k < count; k++) matrix[tokens[t++]!]![m]!++;
  });

  const cost = () =>
    DEPTS.reduce((acc, d, i) => acc + (deptTurnoverAvg(matrix, i) - d.turnoverAvgPct) ** 2, 0);
  let current = cost();
  for (let iter = 0; iter < 200_000 && current > 1e-5; iter++) {
    const d1 = rng.int(0, DEPTS.length - 1);
    const d2 = rng.int(0, DEPTS.length - 1);
    const m1 = rng.int(0, MONTHS - 1);
    const m2 = rng.int(0, MONTHS - 1);
    if (d1 === d2 || m1 === m2) continue;
    const r1 = matrix[d1]!;
    const r2 = matrix[d2]!;
    if (r1[m1]! === 0 || r2[m2]! === 0) continue;
    r1[m1]!--;
    r1[m2]!++;
    r2[m2]!--;
    r2[m1]!++;
    const next = cost();
    if (next <= current) {
      current = next;
    } else {
      r1[m1]!++;
      r1[m2]!--;
      r2[m2]!++;
      r2[m1]!--;
    }
  }
  DEPTS.forEach((d, i) => {
    const got = deptTurnoverAvg(matrix, i);
    if (Math.abs(got - d.turnoverAvgPct) > 0.02) {
      throw new Error(`Leaver matrix did not converge for ${d.code}: ${got.toFixed(3)}`);
    }
  });

  // Pick leaver employees and their leave-month overtime bucket per department.
  DEPTS.forEach((spec, d) => {
    // Leavers come from overtime-eligible staff first (managerial exits are rare).
    const pool = rng.shuffle(emps.filter((e) => e.dept === d));
    const members = [...pool.filter(otEligible), ...pool.filter((e) => !otEligible(e))];
    const months: number[] = [];
    matrix[d]!.forEach((l, m) => {
      for (let k = 0; k < l; k++) months.push(m);
    });
    const buckets: number[] = [];
    spec.leaverBuckets.forEach((n, b) => {
      for (let k = 0; k < n; k++) buckets.push(b);
    });
    rng.shuffle(buckets);
    months.forEach((m, k) => {
      const e = members[k]!;
      e.leaveMonth = m;
      e.leaveBucket = buckets[k]!;
    });
  });
}

function buildRows(emps: Emp[]): Row[] {
  const rows: Row[] = [];
  emps.forEach((e, ei) => {
    const last = e.leaveMonth ?? MONTHS - 1;
    const field = DEPTS[e.dept]!.field;
    for (let m = 0; m <= last; m++) {
      e.rows.push(rows.length);
      rows.push({
        emp: ei,
        dept: e.dept,
        m,
        work: (field ? WORK_DAYS_FIELD : WORK_DAYS_OFFICE)[m]!,
        absent: 0,
        ot: 0,
        imputed: false,
        left: e.leaveMonth === m,
        monthsToExit: e.leaveMonth === null ? null : e.leaveMonth - m,
      });
    }
  });
  return rows;
}

/* ------------------------------------------------------------------ */
/* Overtime                                                            */
/* ------------------------------------------------------------------ */

function bucketOf(avg: number): number {
  if (avg <= 20) return 0;
  if (avg <= 40) return 1;
  return 2;
}

const roundHalf = (v: number) => Math.round(v * 2) / 2;

function calibrateOvertime(rng: Rng, emps: Emp[], rows: Row[]): void {
  // 1. Initial values: personal level + monthly noise.
  for (const e of emps) {
    const spec = DEPTS[e.dept]!;
    if (!otEligible(e)) continue; // stays 0 for every month
    let level: number;
    if (e.leaveBucket === 2) level = 46 + rng.next() * 16;
    else if (e.leaveBucket === 1) level = 25 + rng.next() * 12;
    else if (e.leaveBucket === 0) level = Math.min(spec.overtimeMean, 6 + rng.next() * 10);
    else level = Math.max(0, rng.normal(spec.overtimeMean, spec.overtimeMean * 0.38) * OT_LEVEL_FACTOR[e.jobLevel]);
    for (const r of e.rows) {
      rows[r]!.ot = Math.min(OT_MAX, Math.max(0, roundHalf(level + rng.normal(0, 5))));
    }
  }

  // 2. Empty overtime cells: never a leave month; field departments (paper
  //    timesheets from the pit) are more likely to have gaps.
  const nullWeight = DEPTS.map((d) => (d.field ? d.overtimeMean : d.overtimeMean / 2));
  const candidates = rows.map((_, i) => i).filter((i) => !rows[i]!.left && otEligible(emps[rows[i]!.emp]!));
  let placed = 0;
  while (placed < OVERTIME_NULL_ROWS) {
    const i = rng.pick(candidates);
    const r = rows[i]!;
    if (r.imputed || rng.next() * 41 > nullWeight[r.dept]!) continue;
    r.imputed = true;
    placed++;
  }

  // 3. Seeded local search over the aggregates.
  const nB = 3;
  const rowsB = new Array<number>(nB).fill(0);
  const lvB = new Array<number>(nB).fill(0);
  const rowsBx = new Array<number>(nB).fill(0);
  const lvBx = new Array<number>(nB).fill(0);
  const deptSum = new Array<number>(DEPTS.length).fill(0);
  const deptRows = new Array<number>(DEPTS.length).fill(0);
  const bucket = new Int8Array(rows.length);
  const totalLeavers = DEPTS.reduce((a, d) => a + d.leavers, 0);
  const leaverTargets = [0, 1, 2].map((b) => DEPTS.reduce((a, d) => a + d.leaverBuckets[b]!, 0));
  if (leaverTargets.reduce((a, b) => a + b, 0) !== totalLeavers) throw new Error("bucket config");

  const eff = (r: Row) => (r.imputed ? 0 : r.ot);

  const apply = (e: Emp, sign: 1 | -1) => {
    for (let k = 0; k < e.rows.length; k++) {
      const idx = e.rows[k]!;
      const r = rows[idx]!;
      let sum = 0;
      let n = 0;
      for (let j = Math.max(0, k - 2); j <= k; j++) {
        sum += eff(rows[e.rows[j]!]!);
        n++;
      }
      const b = bucketOf(sum / n);
      if (sign === 1) bucket[idx] = b;
      rowsB[b]! += sign;
      if (r.left) lvB[b]! += sign;
      if (!r.imputed) {
        rowsBx[b]! += sign;
        if (r.left) lvBx[b]! += sign;
      }
      deptSum[r.dept]! += sign * eff(r);
      deptRows[r.dept]! += sign;
    }
  };
  emps.forEach((e) => apply(e, 1));

  const cost = (): number => {
    let c = 0;
    for (let b = 0; b < nB; b++) {
      c += Math.abs(rowsB[b]! - BUCKET_ROWS[b]!);
      c += 30 * Math.abs(lvB[b]! - leaverTargets[b]!);
    }
    DEPTS.forEach((d, i) => {
      const mean = deptSum[i]! / deptRows[i]!;
      c += 40 * Math.max(0, Math.abs(mean - d.overtimeMean) - 0.2);
    });
    const ratio = lvBx[2]! / rowsBx[2]! / (lvBx[0]! / rowsBx[0]!);
    c += 100 * Math.max(0, Math.abs(ratio - SENSITIVITY_RATIO) - 0.025);
    return c;
  };

  const rowsOf = (pred: (i: number) => boolean, maxTries = 200) => {
    for (let tries = 0; tries < maxTries; tries++) {
      const i = rng.int(0, rows.length - 1);
      if (pred(i)) return i;
    }
    return -1;
  };

  let current = cost();
  let iter = 0;
  const MAX_ITER = 4_000_000;
  // Simulated annealing: occasionally accept a worse state early on to leave local minima.
  const accept = (next: number) => {
    if (next <= current) return true;
    const temp = Math.max(0, 2 * (1 - iter / (MAX_ITER * 0.6)));
    return temp > 0 && rng.next() < Math.exp(-(next - current) / temp);
  };
  while (current > 0 && iter++ < MAX_ITER) {
    const kind = rng.next();

    if (kind < 0.12) {
      // Move an empty-overtime cell to another row, in the direction that moves
      // the sensitivity ratio toward its target.
      const ratio = lvBx[2]! / rowsBx[2]! / (lvBx[0]! / rowsBx[0]!);
      const low = ratio < SENSITIVITY_RATIO;
      const i = rowsOf((x) => rows[x]!.imputed && (low ? bucket[x] === 0 : bucket[x] !== 0));
      if (i < 0) continue;
      const ri = rows[i]!;
      const j = rowsOf(
        (x) => !rows[x]!.imputed && !rows[x]!.left && otEligible(emps[rows[x]!.emp]!) && (low ? bucket[x] !== 0 : bucket[x] === 0),
      );
      if (j < 0) continue;
      const rj = rows[j]!;
      const ei = emps[ri.emp]!;
      const ej = emps[rj.emp]!;
      apply(ei, -1);
      if (ej !== ei) apply(ej, -1);
      ri.imputed = false;
      rj.imputed = true;
      apply(ei, 1);
      if (ej !== ei) apply(ej, 1);
      const next = cost();
      if (accept(next)) {
        current = next;
      } else {
        apply(ei, -1);
        if (ej !== ei) apply(ej, -1);
        ri.imputed = true;
        rj.imputed = false;
        apply(ei, 1);
        if (ej !== ei) apply(ej, 1);
      }
      continue;
    }

    let targets: number[] = [];
    let deltas: number[] = [];
    let empIdx = -1;
    if (kind < 0.62) {
      // Push a row's 3-month average across a bucket boundary, spreading the
      // change over the non-imputed rows of its window.
      const wantLeaver = rng.next() < 0.3;
      let from = -1;
      let to = -1;
      const counts = wantLeaver ? lvB : rowsB;
      const goals = wantLeaver ? leaverTargets : BUCKET_ROWS;
      const surplus = [0, 1, 2].filter((b) => counts[b]! > goals[b]!);
      const deficit = [0, 1, 2].filter((b) => counts[b]! < goals[b]!);
      if (surplus.length && deficit.length) {
        from = rng.pick(surplus);
        const d = rng.pick(deficit);
        to = from + Math.sign(d - from);
      } else {
        from = rng.int(0, 2);
        to = from === 0 ? 1 : from === 2 ? 1 : rng.pick([0, 2]);
      }
      const r = rowsOf((x) => bucket[x] === from && (!wantLeaver || rows[x]!.left), wantLeaver ? 2000 : 200);
      if (r < 0) continue;
      const e = emps[rows[r]!.emp]!;
      const k = e.rows.indexOf(r);
      if (!otEligible(e)) continue;
      const window = e.rows.slice(Math.max(0, k - 2), k + 1).filter((x) => !rows[x]!.imputed);
      if (!window.length) continue;
      const n = Math.min(3, k + 1);
      let sum = 0;
      for (let j = Math.max(0, k - 2); j <= k; j++) sum += eff(rows[e.rows[j]!]!);
      const boundary = Math.max(from, to) === 1 ? 20 : 40;
      const dir = to > from ? 1 : -1;
      const need = n * (boundary - sum / n) + dir * (0.5 + rng.next() * 3);
      const share = rng.next() < 0.5 ? window : [rng.pick(window)];
      targets = share;
      deltas = share.map(() => dir * Math.ceil(Math.abs(need / share.length) * 2) / 2);
      empIdx = e === undefined ? -1 : rows[r]!.emp;
    } else {
      // Nudge a department mean (or random jitter).
      const d = rng.int(0, DEPTS.length - 1);
      const mean = deptSum[d]! / deptRows[d]!;
      const goal = DEPTS[d]!.overtimeMean;
      const dir = Math.abs(mean - goal) > 0.15 ? Math.sign(goal - mean) : rng.pick([-1, 1]);
      const t = rowsOf((x) => {
        const r = rows[x]!;
        return r.dept === d && !r.imputed && otEligible(emps[r.emp]!);
      });
      if (t < 0) continue;
      targets = [t];
      deltas = [dir * roundHalf(0.5 + rng.next() * 4)];
      empIdx = rows[t]!.emp;
    }

    const olds = targets.map((t) => rows[t]!.ot);
    const values = targets.map((t, i) => Math.min(OT_MAX, Math.max(0, rows[t]!.ot + deltas[i]!)));
    if (values.every((v, i) => v === olds[i])) continue;
    const e = emps[empIdx]!;
    apply(e, -1);
    targets.forEach((t, i) => (rows[t]!.ot = values[i]!));
    apply(e, 1);
    const next = cost();
    if (accept(next)) {
      current = next;
    } else {
      apply(e, -1);
      targets.forEach((t, i) => (rows[t]!.ot = olds[i]!));
      apply(e, 1);
    }
  }
  if (current > 0) {
    const means = DEPTS.map((_, i) => (deptSum[i]! / deptRows[i]!).toFixed(2)).join(",");
    throw new Error(
      `Overtime calibration did not converge (cost ${current}; rows ${rowsB}; leavers ${lvB}; ` +
        `means ${means}; excl ${rowsBx}/${lvBx})`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Absence                                                             */
/* ------------------------------------------------------------------ */

type Constraint = { members: number[]; target: number; work: number; absent: number };

function calibrateAbsence(rng: Rng, emps: Emp[], rows: Row[]): void {
  const personal = emps.map(() => Math.exp(rng.normal(0, 0.35)));
  const overall = 3.23;
  const p = rows.map((r) => {
    const spec = DEPTS[r.dept]!;
    let g = 1;
    if (r.monthsToExit !== null) {
      g = r.monthsToExit === 0 ? 2.7 : r.monthsToExit === 1 ? 2.3 : r.monthsToExit === 2 ? 1.9 : 1.5;
    }
    return (spec.absenteeismPct / 100) * (ABSENTEEISM_PER_MONTH[r.m]! / overall) * g * personal[r.emp]!;
  });

  const constraints: Constraint[] = [];
  const add = (pred: (r: Row) => boolean, target: number) => {
    const members = rows.map((_, i) => i).filter((i) => pred(rows[i]!));
    const work = members.reduce((a, i) => a + rows[i]!.work, 0);
    constraints.push({ members, target: target / 100, work, absent: 0 });
  };
  DEPTS.forEach((d, i) => add((r) => r.dept === i, d.absenteeismPct));
  ABSENTEEISM_PER_MONTH.forEach((t, m) => add((r) => r.m === m, t));
  add((r) => r.monthsToExit === null, ABSENTEEISM_STAYERS);
  add((r) => r.monthsToExit !== null && r.monthsToExit <= 2, ABSENTEEISM_LEAVERS_LAST3);

  // Raking (iterative proportional fitting) on expected rates.
  for (let it = 0; it < 300; it++) {
    for (const c of constraints) {
      const exp = c.members.reduce((a, i) => a + p[i]! * rows[i]!.work, 0);
      const f = (c.target * c.work) / exp;
      for (const i of c.members) p[i]! *= f;
    }
  }

  // Integerise.
  rows.forEach((r, i) => {
    const e = p[i]! * r.work;
    const base = Math.floor(e);
    r.absent = Math.min(r.work, base + (rng.next() < e - base ? 1 : 0));
  });

  // Greedy ±1 repair until every constraint is within 0.02 pp.
  const membership: number[][] = rows.map(() => []);
  constraints.forEach((c, ci) => {
    c.absent = c.members.reduce((a, i) => a + rows[i]!.absent, 0);
    for (const i of c.members) membership[i]!.push(ci);
  });
  const err = (c: Constraint) => c.absent / c.work - c.target;
  const tol = 0.0002;
  for (let it = 0; it < 200_000; it++) {
    const worst = constraints.reduce((a, c) => (Math.abs(err(c)) > Math.abs(err(a)) ? c : a));
    if (Math.abs(err(worst)) <= tol) return;
    const dir = err(worst) > 0 ? -1 : 1;
    // Among the worst constraint's rows, choose the one whose other constraints
    // benefit most (or suffer least) from the same move.
    let best = -1;
    let bestScore = Infinity;
    for (let s = 0; s < 60; s++) {
      const i = rng.pick(worst.members);
      const r = rows[i]!;
      if (dir < 0 && r.absent === 0) continue;
      if (dir > 0 && r.absent >= r.work - 1) continue;
      let score = 0;
      for (const ci of membership[i]!) {
        const c = constraints[ci]!;
        const before = err(c) ** 2;
        const after = ((c.absent + dir) / c.work - c.target) ** 2;
        score += (after - before) * c.work;
      }
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) continue;
    rows[best]!.absent += dir;
    for (const ci of membership[best]!) constraints[ci]!.absent += dir;
  }
  const bad = constraints.filter((c) => Math.abs(err(c)) > 0.0004);
  if (bad.length) throw new Error(`Absence calibration did not converge (${bad.length} constraints)`);
}

/* ------------------------------------------------------------------ */
/* Salaries → overtime cost per department                             */
/* ------------------------------------------------------------------ */

const rowCost = (hours: number, salary: number) => Math.round((hours * salary * 1.5) / 173);

function calibrateSalaries(emps: Emp[], rows: Row[]): void {
  const hours = (r: Row) => (r.imputed ? 0 : r.ot);
  const deptCost = (d: number) =>
    rows.reduce((a, r) => (r.dept === d ? a + rowCost(hours(r), emps[r.emp]!.salary) : a), 0);

  DEPTS.forEach((spec, d) => {
    const members = emps.filter((e) => e.dept === d);
    for (let pass = 0; pass < 4; pass++) {
      const f = spec.overtimeCostIdr / deptCost(d);
      for (const e of members) e.salary = Math.round((e.salary * f) / 1000) * 1000;
    }
    // Fine-tune: one employee at a time, in steps of Rp 1.000.
    const byHours = members
      .map((e) => ({ e, h: e.rows.reduce((a, r) => a + hours(rows[r]!), 0) }))
      .filter((x) => x.h > 0)
      .sort((a, b) => b.h - a.h);
    for (let k = 0; k < byHours.length; k++) {
      const residual = spec.overtimeCostIdr - deptCost(d);
      if (Math.abs(residual) < 1_000_000) return;
      const { e, h } = byHours[k]!;
      const step = Math.round(residual / ((h * 1.5) / 173) / 1000) * 1000;
      e.salary = Math.max(3_000_000, e.salary + step);
    }
    const residual = spec.overtimeCostIdr - deptCost(d);
    if (Math.abs(residual) >= 1_000_000) throw new Error(`Salary calibration failed for ${spec.code}`);
  });
}

/* ------------------------------------------------------------------ */
/* Raw output with defects                                             */
/* ------------------------------------------------------------------ */

function monthIso(m: number): string {
  return `${YEAR}-${String(m + 1).padStart(2, "0")}-01`;
}

function formatHours(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function toRaw(rng: Rng, emps: Emp[], rows: Row[]): GeneratedDataset {
  // Employees: dirty department spellings.
  const empDept = emps.map((e) => DEPTS[e.dept]!.name);
  DEPTS.forEach((spec, d) => {
    const members = rng.shuffle(emps.map((_, i) => i).filter((i) => emps[i]!.dept === d));
    let k = 0;
    for (const [spelling, , empRows] of spec.dirty) {
      for (let n = 0; n < empRows; n++) empDept[members[k++]!] = spelling;
    }
  });

  // Monthly rows in export order (month, employee).
  const order = rows.map((_, i) => i).sort((a, b) => {
    const ra = rows[a]!;
    const rb = rows[b]!;
    return ra.m - rb.m || ra.emp - rb.emp;
  });
  const rowDept = rows.map((r) => DEPTS[r.dept]!.name);

  // Duplicates come from clean-looking rows (canonical spelling, overtime present)
  // so that dirty-spelling and empty-overtime counts are identical before and after DQ-03.
  const dupSource = new Set<number>();
  DEPTS.forEach((spec, d) => {
    const members = rng.shuffle(rows.map((_, i) => i).filter((i) => rows[i]!.dept === d));
    let k = 0;
    for (const [spelling, monthlyRows] of spec.dirty) {
      for (let n = 0; n < monthlyRows; n++) rowDept[members[k++]!] = spelling;
    }
  });
  const dupCandidates = rng.shuffle(
    rows.map((_, i) => i).filter((i) => !rows[i]!.imputed && rowDept[i] === DEPTS[rows[i]!.dept]!.name),
  );
  for (let k = 0; k < DUPLICATE_ROWS; k++) dupSource.add(dupCandidates[k]!);

  const toMonthly = (i: number): RawMonthlyRow => {
    const r = rows[i]!;
    return {
      employee_id: emps[r.emp]!.id,
      month: monthIso(r.m),
      department: rowDept[i]!,
      work_days: String(r.work),
      absent_days: String(r.absent),
      overtime_hours: r.imputed ? "" : formatHours(r.ot),
      left_this_month: r.left ? "1" : "0",
    };
  };

  const monthly: RawMonthlyRow[] = order.map(toMonthly);
  // Insert each duplicate at a random later position (as a re-exported row would appear).
  // Process from the back so earlier positions are not shifted by later inserts.
  const positions = [...dupSource].map((src) => ({ src, pos: order.indexOf(src) })).sort((a, b) => b.pos - a.pos);
  for (const { src, pos } of positions) {
    const at = rng.int(pos + 1, monthly.length);
    monthly.splice(at, 0, toMonthly(src));
  }

  const employees: RawEmployeeRow[] = emps.map((e, i) => ({
    employee_id: e.id,
    full_name: e.name,
    department: empDept[i]!,
    job_level: e.jobLevel,
    hire_date: e.hireDate,
    base_salary: String(e.salary),
    employment_type: e.employmentType,
  }));

  return { employees, monthly };
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv<T extends Record<string, string>>(columns: readonly (keyof T & string)[], data: T[]): string {
  const lines = [columns.join(",")];
  for (const row of data) lines.push(columns.map((c) => csvCell(row[c] ?? "")).join(","));
  return lines.join("\n") + "\n";
}
