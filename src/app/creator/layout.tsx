import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0e0d0f",
  colorScheme: "dark",
};

export default function CreatorLayout({ children }: { children: ReactNode }) {
  return children;
}
