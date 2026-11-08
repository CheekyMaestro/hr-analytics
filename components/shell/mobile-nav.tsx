"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLinks } from "./nav-links";

/** Below 768 px: top bar with a 44 px menu button opening a sheet (DESIGN.md §4.1). */
export function MobileNav({ brand, author }: { brand: ReactNode; author: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="print-hidden mb-4 flex items-center justify-between md:hidden">
      {brand}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          aria-label="Buka menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-border bg-surface"
        >
          <Menu aria-hidden size={20} strokeWidth={1.75} />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-text/40" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 bg-page p-4 shadow-popover">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-brand">Menu</Dialog.Title>
              <Dialog.Close
                aria-label="Tutup menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-border bg-surface"
              >
                <X aria-hidden size={20} strokeWidth={1.75} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Navigasi halaman HR Analytics</Dialog.Description>
            <nav aria-label="Navigasi utama">
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
            <div className="mt-auto">{author}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
