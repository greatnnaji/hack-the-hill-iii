import Link from "next/link";
import { after, connection } from "next/server";
import { listPetitions, refreshStalePetitions } from "@/lib/petitions/petitions";
import { PetitionItem } from "./_components/PetitionItem";

export default async function PetitionsPage() {
  // The petitions are backed by Postgres and must be loaded for a real request, not during the build.
  await connection();
  const petitions = await listPetitions();
  // Signature counts over 30 minutes old are refreshed from ourcommons.ca after the page is sent.
  if (petitions.length) after(refreshStalePetitions);

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Petitions</h1>
          <p className="mt-1 text-sm text-muted">
            Campaigns that became official House of Commons e-petitions. Signatures only count on ourcommons.ca.
          </p>
        </div>
        <Link href="/campaigns" className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper">
          Browse campaigns
        </Link>
      </div>

      {petitions.length === 0 ? (
        <section className="mt-8 rounded-xl border border-line bg-paper p-6">
          <h2 className="font-semibold">No official petitions yet</h2>
          <p className="mt-1 text-sm text-muted">
            When an MP agrees to sponsor a campaign, our team opens it on ourcommons.ca and it shows up here.
          </p>
          <Link href="/campaigns" className="mt-4 inline-block text-sm text-accent underline">
            Join a campaign
          </Link>
        </section>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {petitions.map((petition) => (
            <PetitionItem key={petition.number} petition={petition} />
          ))}
        </div>
      )}
    </main>
  );
}
