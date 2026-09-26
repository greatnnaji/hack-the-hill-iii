import { TaxCategoryRoute } from "@/components/TaxJourneyRoutes";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TaxCategoryRoute categoryId={id} />;
}
