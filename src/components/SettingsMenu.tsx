"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clearUserInputs } from "@/shared/userInputs";

type Props = {
  name: string | null;
  email: string | null;
  canLogOut: boolean;
};

export function SettingsMenu({ name, email, canLogOut }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const primary = name ?? email ?? "your account";
  const secondary = email && email !== primary ? email : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Settings"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="grid h-9 w-9 place-items-center rounded-full text-current hover:bg-black/5"
      >
        <GearIcon />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-line bg-paper p-3 text-left text-sm text-ink shadow-lg"
      >
        <p className="text-xs text-muted">Signed in as</p>
        <p className="mt-0.5 truncate font-medium">{primary}</p>
        {secondary && <p className="truncate text-xs text-muted">{secondary}</p>}
        <div className="my-3 border-t border-line" />
        {canLogOut ? (
          // A plain link, not next/link: prefetching this URL would log the user out.
          <a href="/auth/logout" onClick={clearUserInputs} className="block rounded px-2 py-1.5 -mx-2 hover:bg-canvas">
            Log out
          </a>
        ) : (
          <>
            <span aria-disabled="true" className="block text-muted">Log out</span>
            <p className="mt-1 text-xs text-muted">Login is off in local dev.</p>
          </>
        )}
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="6.5" strokeWidth="2" />
      <circle cx="12" cy="12" r="8.5" strokeWidth="3" strokeDasharray="3.34 3.34" />
      <circle cx="12" cy="12" r="2.5" strokeWidth="2" />
    </svg>
  );
}
