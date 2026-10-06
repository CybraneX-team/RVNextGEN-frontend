import { AuthGate } from "@/components/AuthProvider";
import CreatorApp from "@/components/creator/CreatorApp";

export default function CreatorPage() {
  return (
    <AuthGate>
      <CreatorApp />
    </AuthGate>
  );
}
