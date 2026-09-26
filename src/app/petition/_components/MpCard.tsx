import Image from "next/image";
import type { Mp } from "@/lib/mp/types";

export function MpCard({ mp }: { mp: Mp }) {
  const rows = [
    { label: "Email", value: mp.email },
    { label: "Hill office", value: mp.hillPhone },
    { label: "Riding office", value: mp.ridingPhone },
  ];

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-center gap-4">
        {mp.photoUrl ? (
          <Image
            src={mp.photoUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-full object-cover"
          />
        ) : (
          <div className="size-14 rounded-full bg-line" aria-hidden />
        )}
        <div>
          <p className="font-semibold">{mp.name}</p>
          <p className="text-sm text-muted">MP for {mp.riding}</p>
          {mp.party && (
            <span className="mt-1 inline-block rounded-full border border-line px-2 text-xs">{mp.party}</span>
          )}
        </div>
      </div>
      <dl className="mt-4 divide-y divide-line border-t border-line text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 py-2">
            <dt className="text-muted">{row.label}</dt>
            <dd className="text-right">{row.value ?? "Not listed"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
