import { useState } from "react";
import { Icon } from "./icons";

export interface VideoLaneItem {
  id: string;
  label: string;
  muted: boolean;
  volume: number;
}

interface Props {
  items: VideoLaneItem[];
  activeId: string | null;
  onReorder: (ids: string[]) => void;
  onMuteToggle: (itemId: string) => void;
  onVolumeChange: (itemId: string, volume: number) => void;
}

/** Полоса видео-лейна: клипы подряд, переставляются драгом. Понтер-based
 * (pointerdown/move/up) — тот же идиом, что и остальной reelkit/приложение
 * (не HTML5 draggable, который ломок кросс-браузерно и в тестах). Клик по
 * mute/громкости НЕ должен начинать драг — проверяем closest("[data-nodrag]")
 * ровно как ConstructorNode делает для своих кнопок/портов. */
export function VideoLane({ items, activeId, onReorder, onMuteToggle, onVolumeChange }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function onPointerDownItem(id: string, ev: React.PointerEvent) {
    if ((ev.target as HTMLElement).closest("[data-nodrag]")) return;
    ev.preventDefault();
    setDragId(id);
    let currentOverId: string | null = null;
    const move = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const block = el?.closest("[data-clip-id]") as HTMLElement | null;
      currentOverId = block?.getAttribute("data-clip-id") ?? null;
      setOverId(currentOverId);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (currentOverId && currentOverId !== id) {
        const order = items.map((it) => it.id);
        const from = order.indexOf(id);
        const to = order.indexOf(currentOverId);
        order.splice(from, 1);
        order.splice(to, 0, id);
        onReorder(order);
      }
      setDragId(null);
      setOverId(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div style={{ display: "flex", gap: 2, height: 40 }}>
      {items.map((it) => (
        <div
          key={it.id}
          data-clip-id={it.id}
          onPointerDown={(e) => onPointerDownItem(it.id, e)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            borderRadius: 4,
            fontSize: 10,
            color: "#fff",
            cursor: "grab",
            userSelect: "none",
            background: it.id === activeId ? "rgba(139,92,246,0.55)" : "rgba(255,255,255,0.12)",
            outline: it.id === dragId ? "2px solid #8b5cf6" : it.id === overId ? "1px dashed rgba(255,255,255,0.6)" : "none",
          }}
        >
          <span>{it.label}</span>
          <div data-nodrag style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button
              type="button"
              onClick={() => onMuteToggle(it.id)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#fff", lineHeight: 0 }}
            >
              {it.muted ? <Icon.VolumeOff size={10} /> : <Icon.Volume size={10} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={it.volume}
              onChange={(e) => onVolumeChange(it.id, Number(e.target.value))}
              style={{ width: 32 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
