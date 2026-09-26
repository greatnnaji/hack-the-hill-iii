import type { Metadata } from "next";

export const metadata: Metadata = { title: "Start a petition · wheredoesmytaxgo" };

export default function PetitionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6 lg:py-10">{children}</div>
    </div>
  );
}
