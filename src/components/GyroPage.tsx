"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon } from "./icons";

type Mode = "Parallax" | "3D Cinema";

export default function GyroPage() {
  const [mode, setMode] = useState<Mode>("Parallax");
  const [sensorOn, setSensorOn] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [sensorMessage, setSensorMessage] = useState("Enable gyro to look around");
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
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
  return <section className="min-h-[calc(100dvh-140px)] px-[23px] pt-[24px] pb-5 lg:px-0 lg:pt-10">
    <div className="mx-auto max-w-[780px]">
      <p className="mb-2 text-[10px] tracking-[2.2px] text-[#b9ccc4]">A NEW WAY TO WATCH</p>
      <h1 className="mb-2 text-[30px] font-semibold tracking-[-1px] text-white lg:text-[38px]">Gyro</h1>
      <p className="mb-6 max-w-[560px] text-[14px] leading-6 text-white/55">Step a little closer to the story. Tilt your phone and let the scene move with you.</p>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-[16px] border border-white/10 bg-white/[0.035] p-1.5" role="tablist" aria-label="Gyro viewing mode">
        {(["Parallax", "3D Cinema"] as Mode[]).map(option => <button key={option} role="tab" aria-selected={mode === option} onClick={() => setMode(option)} className={`rounded-[12px] px-3 py-3 text-left transition-colors ${mode === option ? "bg-[#dce9e2] text-[#10201a]" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
          <span className="block text-[14px] font-semibold">{option}</span>
          <span className={`mt-1 block text-[11px] ${mode === option ? "text-[#10201a]/65" : "text-white/40"}`}>{option === "Parallax" ? "Depth in the picture" : "Look around the story world"}</span>
        </button>)}
      </div>

      <div className="relative mx-auto aspect-[.88] w-full max-w-[560px] overflow-hidden rounded-[24px] border border-white/10 bg-[#13231f] shadow-[0_24px_90px_#0008] sm:aspect-[1.35]">
        {mode === "Parallax" ? <div className="absolute inset-[-34px] overflow-hidden" style={{ perspective: "850px" }}>
          <div className="absolute inset-[-15px] bg-cover bg-center transition-transform duration-200 ease-out" style={{ backgroundImage: "linear-gradient(180deg,#07161122,#07161199),url('/art/yellowstone.svg')", transform: `translate3d(${-tilt.x * .55}px,${-tilt.y * .55}px,0) scale(1.08)` }} />
          <div className="absolute inset-0 transition-transform duration-200 ease-out" style={{ transform: `translate3d(${x},${y},0)` }}>
            <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-[-5%] bottom-[-2%] h-[66%] w-[110%] drop-shadow-[0_16px_20px_#0008]" aria-hidden="true"><path fill="#203b32" d="M0 228 92 100l65 84 86-140 109 164 73-98 175 132v178H0Z"/><path fill="#31483a" d="m0 274 114-93 88 57 91-86 83 97 95-58 129 85v104H0Z"/><path fill="#10231d" d="M0 330 135 252l75 40 122-67 82 68 104-62 82 78v51H0Z"/></svg>
            <div className="absolute inset-x-[-8%] bottom-[-9%] h-[34%] rounded-[50%_50%_0_0] bg-[radial-gradient(ellipse_at_50%_0%,#82906a_0%,#314334_42%,#101812_76%)]" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#07100caa_0%,transparent_36%,transparent_54%,#07100cbb_100%)]" />
          <div className="absolute inset-x-5 top-5 flex items-center justify-between"><span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] tracking-[1px] text-white/75 backdrop-blur-md">DEPTH PREVIEW</span><span className="rounded-full bg-black/25 px-3 py-1.5 text-[10px] text-white/65 backdrop-blur-md">Yellowstone · S2 EP 01</span></div>
          <button type="button" aria-label="Play Yellowstone preview" className="absolute top-1/2 left-1/2 grid size-[58px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-white/15 text-white shadow-lg backdrop-blur-md"><PlayIcon className="size-5" /></button>
          <div className="absolute inset-x-5 bottom-5"><p className="text-[10px] tracking-[1.7px] text-white/60">THE DUTTON RANCH</p><p className="mt-1 text-[21px] font-semibold tracking-[-.5px] text-white">A world with depth.</p></div>
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
          <div className="absolute inset-x-5 top-5 flex items-center justify-between"><span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] tracking-[1px] text-white/75 backdrop-blur-md">STORY WORLD</span><span className="rounded-full bg-black/25 px-3 py-1.5 text-[10px] text-white/65 backdrop-blur-md">Private cinema</span></div>
          <div className="absolute inset-x-5 bottom-5"><p className="text-[10px] tracking-[1.7px] text-white/60">YELLOWSTONE</p><p className="mt-1 text-[21px] font-semibold tracking-[-.5px] text-white">A cinema in the story.</p></div>
        </div>}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={() => void enableGyro()} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-full bg-[#dce9e2] px-5 text-[13px] font-semibold text-[#10201a] transition hover:bg-white">{sensorOn ? "Gyro enabled" : "Enable gyro"}<span aria-hidden="true">↗</span></button>
        <p aria-live="polite" className="text-[12px] text-white/45">{sensorMessage}</p>
      </div>
      <p className="mt-5 max-w-[650px] text-[11px] leading-5 text-white/35">Parallax is a layered preview. Full episode depth playback needs a matching depth video for each episode. 3D Cinema is a motion-reactive scene preview.</p>
    </div>
  </section>;
}
