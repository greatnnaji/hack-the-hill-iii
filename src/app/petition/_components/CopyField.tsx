"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

type Props = { label: string; text: string };

export function CopyField({ label, text }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    setStatus((await copyText(text)) ? "copied" : "failed");
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <button type="button" onClick={copy} className="text-sm text-accent underline">
          {status === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      {status === "failed" && (
        <p className="mt-1 text-xs text-danger">Couldn&rsquo;t copy. Select the text and copy it yourself.</p>
      )}
      <p className="mt-2 whitespace-pre-wrap text-sm">{text}</p>
    </div>
  );
}
