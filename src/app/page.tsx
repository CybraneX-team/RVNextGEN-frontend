import { AuthGate } from "@/components/AuthProvider";
import StreamingApp from "@/components/StreamingApp";

export default function Home() {
  return (
    <AuthGate>
      <StreamingApp />
    </AuthGate>
  );
}
