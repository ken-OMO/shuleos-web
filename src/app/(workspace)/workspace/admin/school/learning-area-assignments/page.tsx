import { TeachingSetup } from "@/features/administrator/components/teaching-setup";

export default async function LearningAreaAssignmentsPage({ searchParams }: { searchParams: Promise<{ teacher?: string | string[] }> }) {
  const { teacher } = await searchParams;
  return <TeachingSetup teacherId={typeof teacher === "string" ? teacher : undefined} />;
}
