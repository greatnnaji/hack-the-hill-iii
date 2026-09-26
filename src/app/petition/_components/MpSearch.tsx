"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { Mp } from "@/lib/mp/types";

type Props = { onPick: (mp: Mp) => void };

export function MpSearch({ onPick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Mp[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const found = await apiFetch<Mp[]>(`/api/mps?q=${encodeURIComponent(q)}`);
        if (!stale) {
          setResults(found);
          setError(null);
        }
      } catch {
        if (!stale) setError("Couldn't reach the MP directory. Try again.");
      }
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  const searchable = query.trim().length >= 2;
  const shown = searchable ? results : [];

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <label className="block text-sm font-semibold">
        Search any MP by name or riding
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
          placeholder="e.g. Naqvi or Ottawa Centre"
        />
      </label>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <ul className="mt-2 divide-y divide-line">
        {shown.map((mp) => (
          <li key={`${mp.name}-${mp.riding}`}>
            <button
              type="button"
              onClick={() => onPick(mp)}
              className="w-full py-2 text-left text-sm hover:bg-canvas"
            >
              <span className="font-medium">{mp.name}</span>
              <span className="text-muted">
                {" "}
                · {mp.riding}
                {mp.party ? ` · ${mp.party}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {searchable && shown.length === 0 && !error && (
        <p className="mt-2 text-sm text-muted">No MPs match that yet.</p>
      )}
    </div>
  );
}
