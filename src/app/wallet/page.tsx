import { AuthGate } from "@/components/AuthProvider";
import WalletApp from "@/components/wallet/WalletApp";

export default function WalletPage() {
  return (
    <AuthGate>
      <WalletApp />
    </AuthGate>
  );
}
