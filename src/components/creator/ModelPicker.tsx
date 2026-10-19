"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Cpu } from "lucide-react";
import type { ModelOption } from "@/lib/creator-models";
import styles from "./ModelPicker.module.css";

const modelKey = (model: ModelOption) => `${model.provider}/${model.model}`;
const providerLogos: Record<string, string> = { openai: "openai", anthropic: "claude", groq: "groq", xai: "grok", openrouter: "openrouter", fal: "fal" };

function ProviderLogo({ provider }: { provider: string }) {
  const logo = providerLogos[provider];
  if (!logo) return <Cpu aria-hidden="true" className="size-4 shrink-0 text-white/65" />;
  const url = `url(/icons/providers/${logo}.svg)`;
  return <span aria-hidden="true" className="size-4 shrink-0 bg-current text-white/80" style={{ maskImage: url, WebkitMaskImage: url, maskSize: "contain", maskPosition: "center", maskRepeat: "no-repeat" }} />;
}

export default function ModelPicker({ models, value, onChange, disabled = false }: {
  models: ModelOption[]; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const positioned = position !== null;
  const selected = models.find((model) => modelKey(model) === value) ?? models[0];

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }

  function show() {
    if (disabled || !models.length) return;
    setActive(Math.max(0, models.findIndex((model) => modelKey(model) === value)));
    setPosition(null);
    setOpen(true);
  }

  function choose(index: number) {
    const model = models[index];
    if (!model) return;
    onChange(modelKey(model));
    close(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(300, window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = below < 310 && above > below;
      setPosition({
        width,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        ...(upward ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
        maxHeight: Math.max(80, Math.min(310, (upward ? above : below) - 8)),
        transformOrigin: upward ? "bottom left" : "top left",
      });
    }
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    }
    // Measure the trigger before paint so the portal stays anchored without clipping.
    place();
    listRef.current?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open && positioned) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, positioned]);

  function keydown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowDown": event.preventDefault(); setActive((index) => (index + 1) % models.length); break;
      case "ArrowUp": event.preventDefault(); setActive((index) => (index - 1 + models.length) % models.length); break;
      case "Home": event.preventDefault(); setActive(0); break;
      case "End": event.preventDefault(); setActive(models.length - 1); break;
      case "Enter": case " ": event.preventDefault(); choose(active); break;
      case "Escape": event.preventDefault(); event.stopPropagation(); close(true); break;
      case "Tab": close(true); break;
    }
  }

  return <div className="min-w-0 max-w-[240px] flex-1">
    <button ref={triggerRef} type="button" aria-label={`Generation model: ${selected?.label ?? "Choose model"}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled || !models.length} onClick={() => open ? close() : show()} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); show(); } }} className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-full border px-3 text-left text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${open ? "border-white/25 bg-[#333335] text-white" : "border-white/[.06] bg-[#29292b] text-white/65 hover:border-white/15 hover:bg-[#303032] hover:text-white/90"}`}>
      {selected && <ProviderLogo provider={selected.provider} />}<span className="truncate">{selected?.label.split(" · ").at(-1) ?? "Choose model"}</span><ChevronDown className={`ml-auto size-3.5 shrink-0 text-white/40 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
    </button>
    {open && createPortal(<div ref={panelRef} style={{ ...position, visibility: position ? "visible" : "hidden" }} className={`${styles.menu} fixed z-[100] flex flex-col overflow-hidden rounded-[12px] border border-white/[.12] bg-[#1b1b1d] p-1 shadow-[0_12px_40px_#0008]`}>
      <div className="flex shrink-0 items-center justify-between border-b border-white/[.07] px-2.5 py-2"><span className="text-[10px] font-medium text-white/45">Model</span><span className="text-[10px] text-white/30">{models.length} available</span></div>
      <div ref={listRef} id={id} role="listbox" aria-label="Generation models" aria-activedescendant={`${id}-${active}`} tabIndex={-1} onKeyDown={keydown} className="min-h-0 overflow-y-auto overscroll-contain py-1 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {models.map((model, index) => {
          const chosen = modelKey(model) === value;
          const [provider, name] = model.label.split(" · ");
          return <div key={modelKey(model)} id={`${id}-${index}`} role="option" aria-label={model.label} title={model.label} aria-selected={chosen} data-index={index} onPointerMove={() => setActive(index)} onClick={() => choose(index)} className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 transition-colors ${active === index ? "bg-[#303033]" : chosen ? "bg-white/[.035]" : "hover:bg-white/[.05]"}`}>
            <ProviderLogo provider={model.provider} />
            <span className="min-w-0 flex-1 truncate text-[12px] text-white/80">{name ?? provider}</span>
            {model.provider === "openrouter" && <span className="text-[9px] text-white/35">OpenRouter</span>}
            {chosen && <Check className="size-3.5 shrink-0 text-white/85" />}
          </div>;
        })}
      </div>
    </div>, document.body)}
  </div>;
}
