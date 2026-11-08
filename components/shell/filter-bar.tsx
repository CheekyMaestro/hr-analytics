"use client";

import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { formatMonth, formatPeriod } from "@/lib/domain/format";
import type { DataRange, Filters } from "@/lib/domain/filters";
import { filtersToQuery } from "@/lib/domain/filters";

type Preset = { value: string; label: string; from: string; to: string };

/** Presets from the data range: full period and the two halves of the year (DESIGN.md §5). */
function presets(months: string[]): Preset[] {
  const first = months[0]!;
  const last = months[months.length - 1]!;
  const list: Preset[] = [{ value: "all", label: formatPeriod(first, last), from: first, to: last }];
  if (months.length === 12) {
    const h1 = months[5]!;
    const h2 = months[6]!;
    list.push({ value: "h1", label: formatPeriod(first, h1), from: first, to: h1 });
    list.push({ value: "h2", label: formatPeriod(h2, last), from: h2, to: last });
  }
  return list;
}

const selectClass =
  "h-11 w-full rounded-pill border border-border bg-surface px-4 text-input-mobile font-semibold text-text md:text-body-sm";
const labelClass = "mb-1 block text-small font-semibold text-muted";

export function FilterBar({
  months,
  departments,
  filters,
}: {
  months: string[];
  departments: Array<{ code: string; name: string }>;
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const id = useId();
  const range: DataRange = { first: months[0]!, last: months[months.length - 1]! };
  const list = presets(months);
  const matched = list.find((p) => p.from === filters.from && p.to === filters.to);
  const [custom, setCustom] = useState(!matched);

  const go = (next: Filters) => {
    startTransition(() => router.replace(`${pathname}${filtersToQuery(next, range)}`, { scroll: false }));
  };

  return (
    <div className="print-hidden flex w-full flex-wrap items-end gap-3 sm:w-auto" aria-busy={pending}>
      <div className="w-full sm:w-48">
        <label htmlFor={`${id}-period`} className={labelClass}>
          Periode
        </label>
        <select
          id={`${id}-period`}
          className={selectClass}
          value={custom ? "custom" : (matched?.value ?? "custom")}
          onChange={(e) => {
            const p = list.find((x) => x.value === e.target.value);
            if (p) {
              setCustom(false);
              go({ ...filters, from: p.from, to: p.to });
            } else setCustom(true);
          }}
        >
          {list.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
          <option value="custom">Pilih bulan…</option>
        </select>
      </div>
      {custom && (
        <>
          <div className="w-[calc(50%-6px)] sm:w-36">
            <label htmlFor={`${id}-from`} className={labelClass}>
              Dari
            </label>
            <select
              id={`${id}-from`}
              className={selectClass}
              value={filters.from}
              onChange={(e) => go({ ...filters, from: e.target.value, to: e.target.value > filters.to ? e.target.value : filters.to })}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[calc(50%-6px)] sm:w-36">
            <label htmlFor={`${id}-to`} className={labelClass}>
              Sampai
            </label>
            <select
              id={`${id}-to`}
              className={selectClass}
              value={filters.to}
              onChange={(e) => go({ ...filters, to: e.target.value, from: e.target.value < filters.from ? e.target.value : filters.from })}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <div className="w-full sm:w-52">
        <label htmlFor={`${id}-dept`} className={labelClass}>
          Departemen
        </label>
        <select
          id={`${id}-dept`}
          className={selectClass}
          value={filters.dept ?? ""}
          onChange={(e) => go({ ...filters, dept: (e.target.value || null) as Filters["dept"] })}
        >
          <option value="">Semua departemen</option>
          {departments.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="print-hidden flex flex-wrap items-end gap-3" aria-hidden>
      <div className="h-11 w-48 rounded-pill border border-border bg-surface" />
      <div className="h-11 w-52 rounded-pill border border-border bg-surface" />
    </div>
  );
}
