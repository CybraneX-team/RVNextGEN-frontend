"use client";

import { Glass, type GlassOptics, type GlassProps } from "@samasante/liquid-glass";
import { forwardRef, type ButtonHTMLAttributes } from "react";

const CLEAR_OPTICS: Partial<GlassOptics> = {
  strength: .16,
  depth: .2,
  curvature: .55,
  bend: .25,
  bendWidth: .08,
  dispersion: .15,
  specular: 1,
  sheen: .95,
  sheenWidth: 2,
  frost: 3,
};

const REGULAR_OPTICS: Partial<GlassOptics> = {
  ...CLEAR_OPTICS,
  strength: .08,
  curvature: .35,
  frost: 10,
};

export function LiquidGlassSurface({ children, className = "", regular = false, ...props }: Omit<GlassProps, "optics"> & { regular?: boolean }) {
  return <Glass {...props} className={`${regular ? "liquid-surface-regular" : "liquid-surface-clear"} ${className}`} optics={regular ? REGULAR_OPTICS : CLEAR_OPTICS}>{children}</Glass>;
}

export const LiquidGlassButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { regular?: boolean; fullWidth?: boolean; wrapperClassName?: string }>(function LiquidGlassButton({ children, className = "", regular = false, fullWidth = false, wrapperClassName = "", ...props }, ref) {
  return <LiquidGlassSurface className={`pointer-events-auto inline-flex rounded-full ${fullWidth ? "w-full" : ""} ${wrapperClassName}`} regular={regular}>
    <button {...props} ref={ref} className={`relative z-10 ${className}`}>{children}</button>
  </LiquidGlassSurface>;
});
