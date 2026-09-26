const STEPS = [
  { title: "Draft", detail: "Write the issue and request (you are here)." },
  { title: "5 supporters", detail: "Five people confirm by email before it goes to an MP." },
  { title: "MP sponsor", detail: "An MP authorizes it. Without one it can't be published." },
  { title: "Open for 120 days", detail: "Anyone in Canada can sign on ourcommons.ca." },
  { title: "500 signatures", detail: "Reaching 500 means it will be presented in the House." },
  { title: "Government response", detail: "Required within 45 days of being tabled." },
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
