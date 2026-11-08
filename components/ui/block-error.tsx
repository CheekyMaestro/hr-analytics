"use client";

import { catchError, type ErrorInfo } from "next/error";

function BlockErrorFallback(_props: object, { retry }: ErrorInfo) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-card bg-surface p-5 py-8 text-center shadow-card"
    >
      <p className="text-body-sm font-semibold">Data gagal dimuat.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="min-h-touch rounded-pill border border-border bg-surface px-4 text-body-sm font-semibold hover:bg-soft"
      >
        Coba lagi
      </button>
    </div>
  );
}

/** Block-level error boundary: "Data gagal dimuat." + "Coba lagi" (DESIGN.md §6.3). */
export const BlockError = catchError(BlockErrorFallback);
