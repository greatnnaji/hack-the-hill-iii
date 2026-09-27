const STEPS = [
  { title: "Write it", detail: "The issue and what you're asking for (you are here)." },
  { title: "Publish to the app", detail: "It goes live on the story and others can join." },
  { title: "1,000 members", detail: "Twice the 500 signatures an e-petition needs, since about half sign officially." },
  { title: "MP sponsor", detail: "Our team asks an MP to authorize it. Without one it can't go on ourcommons.ca." },
  { title: "Sign on ourcommons.ca", detail: "Our team opens the official e-petition and emails every member the link." },
  { title: "Government response", detail: "At 500 signatures it's presented in the House; the government must answer within 45 days." },
];

export function ProcessExplainer() {
  return (
    <aside className="rounded-xl border border-line bg-paper p-5 lg:sticky lg:top-8">
      <h2 className="text-sm font-semibold">How a House of Commons e-petition works</h2>
      <ol className="mt-4 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
                i === 0 ? "bg-ink text-paper" : "bg-line text-muted"
              }`}
            >
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
