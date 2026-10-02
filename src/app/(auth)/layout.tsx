import type { ReactNode } from "react";

export default function AuthFlowLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto h-dvh min-h-[560px] w-full max-w-[430px] overflow-hidden bg-[#0e0d0f] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[62%] bg-cover bg-top"
        style={{ backgroundImage: "linear-gradient(180deg, transparent 52%, #0e0d0f 100%), url('/images/image.png')" }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
