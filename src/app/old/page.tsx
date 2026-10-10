import { AuthGate } from "@/components/AuthProvider";
import StreamingApp from "@/components/StreamingApp";

export default function OldHome() {
  return <AuthGate><StreamingApp /></AuthGate>;
}
