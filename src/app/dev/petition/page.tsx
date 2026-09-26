import Link from "next/link";
import { listStories } from "@/lib/stories";

// Stand-in for Izu's spending feed (screen 04) until it exists.
export default async function DevPetitionPage() {
  const stories = await listStories();
  const money = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 text-ink">
      <div className="mx-auto max-w-[1040px]">
        <p className="text-xs uppercase tracking-wide text-muted">Developer page</p>
        <h1 className="mt-1 text-2xl font-semibold">Spending stories</h1>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {stories.map((story) => (
            <li key={story.id} className="rounded-xl border border-line bg-paper p-4">
              <p className="text-xs text-accent">
                {story.fiscal_year} · {story.department}
              </p>
              <h2 className="mt-1 font-medium">{story.title}</h2>
              <p className="mt-1 text-sm text-muted">{money.format(story.amount)}</p>
              <Link
                href={`/petition/new?story=${encodeURIComponent(story.id)}`}
                className="mt-3 inline-block text-sm font-medium text-accent underline"
              >
                Start a petition
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
