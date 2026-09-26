"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import type { ComposeLinks } from "@/lib/mp/sponsorEmail";

type Props = {
  links: ComposeLinks;
  emailText: string;
  continueHref: string;
  onSent: () => void;
};

const linkClass = "block rounded-lg border border-line bg-paper px-4 py-3 text-center text-sm font-medium hover:border-ink";

export function SendOptions({ links, emailText, continueHref, onSent }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    setStatus((await copyText(emailText)) ? "copied" : "failed");
  }

  return (
    <div className="space-y-2">
      <a
        href={links.gmail}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onSent}
        className="block rounded-lg bg-ink px-4 py-3 text-center text-sm font-medium text-paper"
      >
        Open in Gmail
      </a>
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={links.outlook} target="_blank" rel="noopener noreferrer" onClick={onSent} className={linkClass}>
          Open in Outlook
        </a>
        <a href={links.mailto} onClick={onSent} className={linkClass}>
          Use my email app
        </a>
      </div>
      <button type="button" onClick={copy} className={`${linkClass} w-full`}>
        {status === "copied" ? "Copied" : "Copy email"}
      </button>
      {status === "failed" && (
        <p className="text-center text-xs text-danger">
          Couldn&rsquo;t copy. Use one of the buttons above, or copy the letter by hand.
        </p>
      )}
      {status === "copied" && (
        <a href={continueHref} className="block text-center text-sm text-accent underline">
          Continue to step 3
        </a>
      )}
    </div>
  );
}
