import Link from "next/link";

// backHref for a link, or onBack when going back stays on the same page (steps 1 and 2 of Start a campaign).
type Props = { step: 1 | 2 | 3; backHref?: string; onBack?: () => void };

export function StepHeader({ step, backHref, onBack }: Props) {
  const label = step === 1 ? "Cancel" : "← Back";
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between text-sm">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-muted hover:text-ink">
            {label}
          </button>
        ) : (
          <Link href={backHref ?? "/dev/petition"} className="text-muted hover:text-ink">
            {label}
          </Link>
        )}
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
