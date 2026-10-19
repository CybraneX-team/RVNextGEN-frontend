import { AuthGate } from "@/components/AuthProvider";
import ProjectWorkspace from "@/components/creator/ProjectWorkspace";
import CreatorSectionPage from "@/components/creator/CreatorSectionPage";
import type { CreatorSection } from "@/components/creator/CreatorSidebar";

const sections = new Set<CreatorSection>(["templates", "videos", "archive", "library", "brand-kits", "avatars", "voices"]);

export default async function CreatorProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (sections.has(projectId as CreatorSection)) {
    return <AuthGate><CreatorSectionPage section={projectId as Exclude<CreatorSection, "home">} /></AuthGate>;
  }
  return (
    <AuthGate>
      <ProjectWorkspace key={projectId} projectId={projectId} />
    </AuthGate>
  );
}
