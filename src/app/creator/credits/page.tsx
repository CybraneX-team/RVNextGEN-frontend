import { AuthGate } from "@/components/AuthProvider";
import CreditsApp from "@/components/creator/CreditsApp";

export default function CreatorCreditsPage() {
  return (
    <AuthGate>
      <CreditsApp />
    </AuthGate>
  );
}
