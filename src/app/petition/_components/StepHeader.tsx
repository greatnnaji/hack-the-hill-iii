import Link from "next/link";

type Props = { step: 1 | 2 | 3; backHref: string };

export function StepHeader({ step, backHref }: Props) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between text-sm">
        <Link href={backHref} className="text-muted hover:text-ink">
          {step === 1 ? "Cancel" : "← Back"}
        </Link>
        <span className="text-muted">Step {step} of 3</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 rounded-full ${n <= step ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>
    </header>
  );
}
