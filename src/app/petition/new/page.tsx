import Link from "next/link";
import { getStory } from "@/lib/stories";
import { PetitionForm } from "../_components/PetitionForm";
import { ProcessExplainer } from "../_components/ProcessExplainer";
import { StepHeader } from "../_components/StepHeader";

type Props = { searchParams: Promise<{ story?: string | string[] }> };

export default async function NewPetitionPage({ searchParams }: Props) {
  const { story: storyId } = await searchParams;
  const story = typeof storyId === "string" ? await getStory(storyId) : null;

  if (!story) {
    return (
      <main>
        <h1 className="text-xl font-semibold">We couldn&rsquo;t find that spending story</h1>
        <Link href="/dev/petition" className="mt-4 inline-block text-sm text-accent underline">
          Back to spending
        </Link>
      </main>
    );
  }

  return (
    <main>
      <StepHeader step={1} backHref="/dev/petition" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PetitionForm story={{ id: story.id, title: story.title }} />
        <ProcessExplainer />
      </div>
    </main>
  );
}
