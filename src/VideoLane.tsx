import { useState } from "react";
import { Icon } from "./icons";
import { layoutSequential, TRACK_LABEL_WIDTH, TRACK_LABEL_GAP } from "./timelineMath";

export interface VideoLaneItem {
  id: string;
  label: string;
  muted: boolean;
  volume: number;
  /** Длительность ЭТОГО клипа, сек — задаёт ширину пилюли пропорционально
   * длительности (см. `duration`-проп ниже: общая длительность таймлайна). */
  duration: number;
}

interface Props {
  /** Подпись дорожки слева (напр. «Видео») — тот же паттерн, что у AudioLane. */
  label: string;
  items: VideoLaneItem[];
  /** Общая длительность ВСЕГО таймлайна (не суммы видео-клипов — аудио может
   * тянуться дальше) — задаёт масштаб % для позиционирования пилюль. */
  duration: number;
  activeId: string | null;
  onReorder: (ids: string[]) => void;
  onMuteToggle: (itemId: string) => void;
  onVolumeChange: (itemId: string, volume: number) => void;
}

const MIN_PCT_WIDTH = 6;

/** Полоса видео-лейна: клипы подряд, ширина каждой пилюли — пропорционально
 * длительности клипа (та же раскладка `layoutSequential`, что считает и
 * составной проигрыватель в ReelTimeline.tsx) — иначе общая линия-плейхед
 * разъезжалась бы с клипами (раньше лейн делил ширину ПОРОВНУ, независимо от
 * длительности). Переставляются драгом, понтер-based (pointerdown/move/up) —
 * тот же идиом, что и остальной reelkit/приложение (не HTML5 draggable,
 * который ломок кросс-браузерно и в тестах). Клик по mute/громкости НЕ
 * должен начинать драг — проверяем closest("[data-nodrag]") ровно как
 * ConstructorNode делает для своих кнопок/портов. */
export function VideoLane({ label, items, duration, activeId, onReorder, onMuteToggle, onVolumeChange }: Props) {
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

  const laidOut = layoutSequential(items.map((it) => ({ id: it.id, duration: it.duration })));
  const byId = new Map(items.map((it) => [it.id, it]));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: TRACK_LABEL_GAP }}>
      <span style={{ width: TRACK_LABEL_WIDTH, fontSize: 10, color: "rgba(255,255,255,0.65)", flexShrink: 0 }}>{label}</span>
      <div style={{ position: "relative", flex: 1, height: 30 }}>
        {laidOut.map((pos) => {
          const it = byId.get(pos.id);
          if (!it) return null;
          const pct = Math.max(MIN_PCT_WIDTH, duration > 0 ? (pos.duration / duration) * 100 : 0);
          return (
            <div
              key={it.id}
              data-clip-id={it.id}
              onPointerDown={(e) => onPointerDownItem(it.id, e)}
              style={{
                position: "absolute",
                left: `${duration > 0 ? (pos.start / duration) * 100 : 0}%`,
                width: `${pct}%`,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                borderRadius: 999,
                fontSize: 10,
                color: "#fff",
                cursor: "grab",
                userSelect: "none",
                overflow: "hidden",
                whiteSpace: "nowrap",
                background: it.id === activeId ? "#8b5cf6" : "rgba(255,255,255,0.14)",
                outline: it.id === dragId ? "2px solid #8b5cf6" : it.id === overId ? "1px dashed rgba(255,255,255,0.6)" : "none",
              }}
            >
              <span>{it.label}</span>
              <div data-nodrag style={{ display: "flex", alignItems: "center", gap: 2, opacity: 0.75 }}>
                <button
                  type="button"
                  onClick={() => onMuteToggle(it.id)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#fff", lineHeight: 0 }}
                >
                  {it.muted ? <Icon.VolumeOff size={9} /> : <Icon.Volume size={9} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={it.volume}
                  onChange={(e) => onVolumeChange(it.id, Number(e.target.value))}
                  style={{ width: 24 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
