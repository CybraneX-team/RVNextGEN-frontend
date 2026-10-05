import { AuthGate } from "@/components/AuthProvider";
import AdminApp from "@/components/AdminApp";

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminApp />
    </AuthGate>
  );
}
