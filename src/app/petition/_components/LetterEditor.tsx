"use client";

import { useState } from "react";

type Props = {
  letter: string;
  edited: boolean;
  onSave: (text: string | null) => void;
};

export function LetterEditor({ letter, edited, onSave }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sponsorship request</h2>
        <div className="flex gap-3 text-sm">
          {edited && (
            <button type="button" onClick={() => onSave(null)} className="text-muted underline">
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
          onBlur={(event) => onSave(event.target.value)}
          className="mt-2 min-h-72 w-full rounded-xl border border-line bg-paper p-4 text-sm"
        />
      ) : (
        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-paper p-4 text-sm">{letter}</p>
      )}
    </div>
  );
}
