import { AuthGate } from "@/components/AuthProvider";
import ProjectWorkspace from "@/components/creator/ProjectWorkspace";

export default async function CreatorProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <AuthGate>
      <ProjectWorkspace projectId={projectId} />
    </AuthGate>
  );
}
