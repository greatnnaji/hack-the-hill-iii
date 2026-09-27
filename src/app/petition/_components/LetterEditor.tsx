"use client";

import { useState } from "react";
import { LIMITS } from "@/lib/petition";

type Props = {
  letter: string;
  edited: boolean;
  onSave: (text: string | null) => void;
};

export function LetterEditor({ letter, edited, onSave }: Props) {
  const [editing, setEditing] = useState(false);

  function reset() {
    // Close the editor too, or its textarea would keep the old text and save it again on blur.
    setEditing(false);
    onSave(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sponsorship request</h2>
        <div className="flex gap-3 text-sm">
          {edited && (
            <button type="button" onClick={reset} className="text-muted underline">
              Reset to template
            </button>
          )}
          <button type="button" onClick={() => setEditing(!editing)} className="underline">
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>
      {editing ? (
        <textarea
          defaultValue={letter}
          maxLength={LIMITS.sponsorEmail}
          onBlur={(event) => {
            if (event.target.value !== letter) onSave(event.target.value);
          }}
          className="mt-2 min-h-72 w-full rounded-xl border border-line bg-paper p-4 text-sm"
        />
      ) : (
        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-paper p-4 text-sm">{letter}</p>
      )}
    </div>
  );
}
