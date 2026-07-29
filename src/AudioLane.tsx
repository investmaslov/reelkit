import { useRef } from "react";
import { Icon } from "./icons";
import { TRACK_LABEL_WIDTH, TRACK_LABEL_GAP } from "./timelineMath";

export interface AudioLaneItem {
  id: string;
  label: string;
  start: number;
  duration: number;
  muted: boolean;
  volume: number;
}

interface Props {
  label: string;
  color: string;
  items: AudioLaneItem[];
  /** Общая длительность таймлайна — переводит px<->сек при перетаскивании. */
  duration: number;
  onMove: (itemId: string, start: number) => void;
  onMuteToggle: (itemId: string) => void;
  onVolumeChange: (itemId: string, volume: number) => void;
}

const LANE_HEIGHT = 26;

/** Одна аудио-дорожка: элементы позиционируются по `start` (независимо, могут
 * перекрываться) — двигаются перетаскиванием по горизонтали (тот же
 * понтер-идиом, что и VideoLane), плюс mute/громкость на каждый элемент. Клик
 * по mute/громкости НЕ должен начинать драг — closest("[data-nodrag]"),
 * ровно как в VideoLane/ConstructorNode. */
export function AudioLane({ label, color, items, duration, onMove, onMuteToggle, onVolumeChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  function onPointerDownItem(item: AudioLaneItem, ev: React.PointerEvent) {
    if ((ev.target as HTMLElement).closest("[data-nodrag]")) return;
    ev.preventDefault();
    const trackWidth = trackRef.current?.getBoundingClientRect().width || 1;
    const startX = ev.clientX;
    const startSec = item.start;
    const move = (e: PointerEvent) => {
      const deltaSec = ((e.clientX - startX) / trackWidth) * duration;
      onMove(item.id, Math.max(0, startSec + deltaSec));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: TRACK_LABEL_GAP }}>
      <span style={{ width: TRACK_LABEL_WIDTH, fontSize: 10, color: "rgba(255,255,255,0.65)", flexShrink: 0 }}>{label}</span>
      <div
        ref={trackRef}
        style={{ position: "relative", flex: 1, height: LANE_HEIGHT, background: "rgba(255,255,255,0.05)", borderRadius: 999 }}
      >
        {items.map((it) => (
          <div
            key={it.id}
            onPointerDown={(e) => onPointerDownItem(it, e)}
            style={{
              position: "absolute",
              left: `${duration > 0 ? (it.start / duration) * 100 : 0}%`,
              width: `${duration > 0 ? (it.duration / duration) * 100 : 0}%`,
              height: "100%",
              borderRadius: 999,
              background: `${color}55`,
              border: `1px solid ${color}`,
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
              padding: "0 4px",
            }}
          >
            <button
              type="button"
              data-nodrag
              onClick={() => onMuteToggle(it.id)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0, color: "#fff" }}
            >
              {it.muted ? <Icon.VolumeOff size={11} /> : <Icon.Volume size={11} />}
            </button>
            <input
              type="range"
              data-nodrag
              min={0}
              max={1}
              step={0.05}
              value={it.volume}
              onChange={(e) => onVolumeChange(it.id, Number(e.target.value))}
              style={{ width: 36 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
