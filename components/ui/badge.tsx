import { cn } from "@/lib/cn";
import { RISK_LABEL, type RiskLevel } from "@/lib/domain/risk";
import type { DqStatus } from "@/lib/queries/types";

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE: Record<Tone, string> = {
  success: "bg-success/(--tint) text-success",
  warning: "bg-warning/(--tint) text-warning",
  danger: "bg-danger/(--tint) text-danger",
  neutral: "bg-surface-muted text-muted",
};

/** Pill badge: tint fill + full-colour text; the label is always present (never colour alone). */
export function Badge({ tone, children, className }: { tone: Tone; children: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-pill px-2.5 text-small font-bold whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const RISK_TONE: Record<RiskLevel, Tone> = { tinggi: "danger", sedang: "warning", rendah: "success" };

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge tone={RISK_TONE[level]}>{RISK_LABEL[level]}</Badge>;
}

const DQ: Record<DqStatus, { tone: Tone; label: string }> = {
  diperbaiki: { tone: "success", label: "Diperbaiki" },
  perlu_konfirmasi: { tone: "warning", label: "Perlu konfirmasi" },
  lolos: { tone: "neutral", label: "Lolos cek" },
  gagal: { tone: "danger", label: "Gagal" },
};

export function DqStatusBadge({ status }: { status: DqStatus }) {
  return <Badge tone={DQ[status].tone}>{DQ[status].label}</Badge>;
}
