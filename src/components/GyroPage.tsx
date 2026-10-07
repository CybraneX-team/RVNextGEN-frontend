"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Mode = "Parallax" | "3D Cinema";

export default function GyroPage({ onClose }: { onClose?: () => void }) {
  const [mode, setMode] = useState<Mode>("Parallax");
  const [sensorOn, setSensorOn] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [sensorMessage, setSensorMessage] = useState("Enable gyro to look around");
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    if (!sensorOn) return;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return;
      setTilt({ x: Math.max(-14, Math.min(14, event.gamma * 0.45)), y: Math.max(-10, Math.min(10, (event.beta - 45) * 0.22)) });
      setSensorMessage("Move your phone to explore");
    };
    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [sensorOn]);

  async function enableGyro() {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setSensorMessage("Gyroscope isn’t available in this browser");
      return;
    }
    const OrientationEvent = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
    if (typeof OrientationEvent.requestPermission === "function") {
      try {
        const permission = await OrientationEvent.requestPermission();
        if (permission !== "granted") { setSensorMessage("Allow motion access in your browser settings"); return; }
      } catch {
        setSensorMessage("Motion access was unavailable. Try again in Safari or Chrome.");
        return;
      }
    }
    setSensorMessage("Move your phone to explore");
    setSensorOn(true);
  }

  const x = `${tilt.x}px`;
  const y = `${tilt.y}px`;
  const backClass = "grid size-11 shrink-0 place-items-center rounded-full border border-white/15 bg-black/25 text-white/90 backdrop-blur-xl hover:bg-black/40";
  const backIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>;
  return <section aria-label="Gyro immersive viewer" className="fixed inset-0 z-50 h-dvh w-full overflow-hidden bg-[#09100d] text-white" onPointerMove={event => {
    if (sensorOn || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setTilt({ x: ((event.clientX - bounds.left) / bounds.width - .5) * 28, y: ((event.clientY - bounds.top) / bounds.height - .5) * 20 });
  }} onPointerLeave={() => { if (!sensorOn) setTilt({ x: 0, y: 0 }); }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/35 to-transparent px-4 pt-[max(16px,env(safe-area-inset-top))] pb-12 sm:px-6">
        <div className="pointer-events-auto">{onClose ? <button type="button" onClick={onClose} className={backClass} aria-label="Close Gyro">{backIcon}</button> : <Link href="/" className={backClass} aria-label="Back to home">{backIcon}</Link>}</div>
        <div className="pointer-events-auto flex rounded-full border border-white/15 bg-black/25 p-1 backdrop-blur-xl" role="group" aria-label="Viewing mode">
          {(["Parallax", "3D Cinema"] as Mode[]).map(option => <button type="button" key={option} aria-pressed={mode === option} onClick={() => setMode(option)} className={`min-h-10 rounded-full px-4 text-[12px] font-medium transition-colors ${mode === option ? "bg-white/90 text-[#10201a]" : "text-white/70 hover:text-white"}`}>{option}</button>)}
        </div>
      </div>
      <div className="absolute inset-0 overflow-hidden">
        {mode === "Parallax" ? <div className="absolute inset-[-34px] overflow-hidden" style={{ perspective: "850px" }}>
          <div className="absolute inset-[-15px] bg-cover bg-center transition-transform duration-200 ease-out" style={{ backgroundImage: "linear-gradient(180deg,#07161122,#07161199),url('/art/yellowstone.svg')", transform: `translate3d(${-tilt.x * .55}px,${-tilt.y * .55}px,0) scale(1.08)` }} />
          <div className="absolute inset-0 transition-transform duration-200 ease-out" style={{ transform: `translate3d(${x},${y},0)` }}>
            <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-[-5%] bottom-[-2%] h-[66%] w-[110%] drop-shadow-[0_16px_20px_#0008]" aria-hidden="true"><path fill="#203b32" d="M0 228 92 100l65 84 86-140 109 164 73-98 175 132v178H0Z"/><path fill="#31483a" d="m0 274 114-93 88 57 91-86 83 97 95-58 129 85v104H0Z"/><path fill="#10231d" d="M0 330 135 252l75 40 122-67 82 68 104-62 82 78v51H0Z"/></svg>
            <div className="absolute inset-x-[-8%] bottom-[-9%] h-[34%] rounded-[50%_50%_0_0] bg-[radial-gradient(ellipse_at_50%_0%,#82906a_0%,#314334_42%,#101812_76%)]" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#07100caa_0%,transparent_36%,transparent_54%,#07100cbb_100%)]" />
        </div> : <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_58%,#b77b3c_0%,#624526_27%,#1d241c_64%,#09100d_100%)]" style={{ perspective: "900px" }}>
          <div className="absolute inset-[-12%] transition-transform duration-200 ease-out" style={{ transform: `translate3d(${-tilt.x}px,${-tilt.y}px,0) rotateY(${tilt.x * .08}deg)` }}>
            <div className="absolute inset-x-[-10%] bottom-0 h-[62%] bg-[linear-gradient(165deg,transparent_0_25%,#17241c_25.5%_55%,#090f0c_56%)]" />
            <div className="absolute bottom-[17%] left-[11%] h-[36%] w-[78%] border border-[#d3a76b55] bg-[linear-gradient(90deg,#30271f,#5b4229_48%,#29231d)] shadow-[0_20px_80px_#0009]" style={{ transform: "rotateY(-8deg) rotateX(2deg)" }}>
              <div className="absolute inset-x-[6%] top-[12%] h-[66%] border border-[#d9ba8055] bg-[linear-gradient(180deg,#3a5460aa,#152621dd)] shadow-[inset_0_0_45px_#0009]" />
              <div className="absolute inset-x-[6%] top-[12%] h-[66%] grid place-items-center"><div className="h-[80%] w-[76%] rounded-[50%_50%_18%_18%] bg-[radial-gradient(ellipse_at_50%_28%,#dbb286_0_11%,#2d3028_12%_42%,transparent_43%)] opacity-80" /></div>
              <div className="absolute inset-x-[8%] bottom-[7%] h-[2px] bg-[#d9ba8070]" />
            </div>
            <div className="absolute bottom-[5%] left-[35%] h-[13%] w-[30%] rounded-[50%] bg-[#090d0a] blur-xl" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#05080699,transparent_38%,#05080655)]" />
        </div>}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-5 pt-12 pb-[max(24px,env(safe-area-inset-bottom))]">
        <p aria-live="polite" className={sensorMessage === "Enable gyro to look around" || sensorOn ? "sr-only" : "max-w-[320px] rounded-xl bg-black/60 px-4 py-2 text-center text-[12px] text-white/80 backdrop-blur-xl"}>{sensorMessage}</p>
        <button type="button" onClick={() => { if (sensorOn) { setSensorOn(false); setTilt({ x: 0, y: 0 }); setSensorMessage("Enable gyro to look around"); } else void enableGyro(); }} aria-pressed={sensorOn} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/25 px-5 text-[12px] font-medium text-white/90 backdrop-blur-xl transition hover:bg-black/40"><span aria-hidden="true" className={`size-1.5 rounded-full ${sensorOn ? "bg-[#a2d9bf]" : "bg-white/40"}`} />{sensorOn ? "Gyro on" : "Enable gyro"}</button>
      </div>
  </section>;
}
