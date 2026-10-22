"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { CreatorStep } from "@/lib/creator";
import styles from "./ProjectWorkspace.module.css";

type CanvasItem = { step: CreatorStep; content: ReactNode };
type View = { x: number; y: number; zoom: number };
const GAP = 64;
const CARD_WIDTH = 740;

export default function InfiniteCanvas({ items, selectedId, onSelect }: {
  items: CanvasItem[]; selectedId: string | null; onSelect: (step: CreatorStep) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const wheelTimer = useRef<number | null>(null);
  const gestureZoom = useRef(1);
  const [view, setView] = useState<View>({ x: 100, y: 90, zoom: 1 });
  const [ready, setReady] = useState(false);

  const focus = useCallback((id: string, animate = true) => {
    const area = viewport.current;
    const node = area?.querySelector<HTMLElement>(`[data-canvas-id="${CSS.escape(id)}"]`);
    if (!area || !node) return;
    const zoom = Math.min(1, Math.max(.62, (area.clientWidth - 100) / node.offsetWidth));
    const x = (area.clientWidth - node.offsetWidth * zoom) / 2 - node.offsetLeft * zoom;
    const y = Math.max(52, (area.clientHeight - Math.min(node.offsetHeight, area.clientHeight - 100) * zoom) / 2) - node.offsetTop * zoom;
    if (!animate) area.dataset.instant = "true";
    setView({ x, y, zoom });
    if (!animate) requestAnimationFrame(() => { delete area.dataset.instant; });
    setReady(true);
  }, []);

  useEffect(() => {
    if (selectedId) focus(selectedId, ready);
  }, [selectedId, items.length, focus, ready]);

  // Keep trackpad gestures away from the browser while the canvas is on screen: no swipe back/forward
  // (overscroll navigation). The canvas handlers below pan and pinch-zoom instead.
  useEffect(() => {
    const root = document.documentElement;
    const previous = { root: root.style.overscrollBehavior, body: document.body.style.overscrollBehavior };
    root.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    const scrollsHorizontally = (target: EventTarget | null) => {
      for (let node = target instanceof Element ? target : null; node && node !== document.documentElement; node = node.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth + 1) return true;
      }
      return false;
    };
    const guard = (event: globalThis.WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && !scrollsHorizontally(event.target)) event.preventDefault();
    };
    window.addEventListener("wheel", guard, { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel", guard, { capture: true });
      root.style.overscrollBehavior = previous.root;
      document.body.style.overscrollBehavior = previous.body;
    };
  }, []);

  useEffect(() => {
    const area = viewport.current;
    if (!area) return;
    const onWheel = (event: globalThis.WheelEvent) => {
      // Vertical scrolling inside a card stays native; everything else belongs to the canvas, so a
      // horizontal two-finger swipe pans instead of triggering the browser's back/forward gesture.
      const verticalInCard = event.target instanceof Element && event.target.closest("[data-canvas-card]") && !event.ctrlKey && !event.metaKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX);
      if (verticalInCard) return;
      event.preventDefault();
      area.dataset.wheeling = "true";
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => { delete area.dataset.wheeling; }, 120);
      if (event.ctrlKey || event.metaKey) zoomAt(view.zoom * Math.exp(-event.deltaY * .008), event.clientX, event.clientY);
      else setView((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
    };
    const onGestureStart = (event: Event) => { event.preventDefault(); gestureZoom.current = view.zoom; };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      if (event.target instanceof Node && area.contains(event.target)) zoomAt(gestureZoom.current * ((event as Event & { scale?: number }).scale ?? 1));
    };
    area.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("gesturestart", onGestureStart, { passive: false });
    document.addEventListener("gesturechange", onGestureChange, { passive: false });
    return () => {
      area.removeEventListener("wheel", onWheel);
      document.removeEventListener("gesturestart", onGestureStart);
      document.removeEventListener("gesturechange", onGestureChange);
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
    };
  }, [view.zoom]);

  function zoomAt(next: number, clientX?: number, clientY?: number) {
    const area = viewport.current;
    if (!area) return;
    const bounds = area.getBoundingClientRect();
    const px = (clientX ?? bounds.left + bounds.width / 2) - bounds.left;
    const py = (clientY ?? bounds.top + bounds.height / 2) - bounds.top;
    setView((current) => {
      const zoom = Math.min(1.6, Math.max(.35, next));
      const ratio = zoom / current.zoom;
      return { zoom, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
    });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("[data-canvas-card],button"))) return;
    window.getSelection()?.removeAllRanges();
    drag.current = { x: event.clientX, y: event.clientY, startX: view.x, startY: view.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const { x, y, startX, startY } = drag.current;
    setView((current) => ({ ...current, x: startX + event.clientX - x, y: startY + event.clientY - y }));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <section aria-label="Project canvas" ref={viewport} className={`${styles.canvas} ${styles.canvasViewport} relative hidden min-h-0 flex-1 overflow-hidden lg:block`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
    <div className={styles.canvasWorld} style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`, opacity: ready ? 1 : 0 }}>
      {items.map(({ step, content }, index) => <div key={step.id} data-canvas-card data-canvas-id={step.id} role="button" tabIndex={0} aria-label={`${step.kind.toLowerCase()} canvas card ${index + 1}`} aria-pressed={selectedId === step.id} onClick={() => onSelect(step)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(step); } }} className={`${styles.canvasCard} ${selectedId === step.id ? styles.canvasCardSelected : ""}`} style={{ left: index * (CARD_WIDTH + GAP), width: CARD_WIDTH }}>
        {content}
      </div>)}
    </div>
    <p className="pointer-events-none absolute bottom-7 left-6 text-[11px] text-white/30">Drag to move · Pinch to zoom</p>
    <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1 rounded-full border border-white/15 bg-[#1d1d1f] p-1 text-white/70 shadow-lg">
      <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomAt(view.zoom / 1.2)} className="grid size-8 place-items-center rounded-full hover:bg-white/10"><Minus className="size-4" /></button>
      <span className="w-11 text-center text-[11px] tabular-nums">{Math.round(view.zoom * 100)}%</span>
      <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomAt(view.zoom * 1.2)} className="grid size-8 place-items-center rounded-full hover:bg-white/10"><Plus className="size-4" /></button>
      <span className="mx-0.5 h-4 w-px bg-white/15" />
      <button type="button" aria-label="Focus selected card" title="Focus selected card" onClick={() => { if (selectedId) focus(selectedId); }} className="grid size-8 place-items-center rounded-full hover:bg-white/10"><Maximize2 className="size-4" /></button>
    </div>
  </section>;
}
