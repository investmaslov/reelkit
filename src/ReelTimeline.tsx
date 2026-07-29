import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { fmt } from "./time";
import { Ruler } from "./Ruler";
import { Icon } from "./icons";
import { VideoLane, type VideoLaneItem } from "./VideoLane";
import { AudioLane, type AudioLaneItem } from "./AudioLane";
import {
  activeItemAt, layoutSequential, totalDuration, TRACK_LABEL_WIDTH, TRACK_LABEL_GAP, type TimelineItem,
} from "./timelineMath";

export interface ReelTimelineClip {
  id: string;
  src: string;
  label: string;
  muted: boolean;
  volume: number;
}

export interface ReelTimelineAudioItem extends ReelTimelineClip {
  start: number;
}

export interface ReelTimelineAudioLane {
  id: string;
  label: string;
  color: string;
  items: ReelTimelineAudioItem[];
}

export interface ReelTimelineLabels {
  timeline: string;
  /** Подпись строки видео-лейна слева (та же роль, что и `label` у каждого
   * ReelTimelineAudioLane) — по умолчанию английская, i18n-агностик. */
  video: string;
}

const DEFAULT_TIMELINE_LABELS: ReelTimelineLabels = {
  timeline: "Timeline",
  video: "Video",
};

/** Одна строка дорожки: узкая колонка-подпись слева + сама дорожка — общая
 * геометрия с VideoLane/AudioLane (см. TRACK_LABEL_WIDTH/GAP), чтобы
 * линия-плейхед (см. ниже) выравнивалась со всеми дорожками одинаково.
 * Используется только для Ruler — у VideoLane/AudioLane та же раскладка уже
 * встроена внутрь них самих. */
function TrackRow({ label, children }: { label: string | null; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: TRACK_LABEL_GAP }}>
      <span style={{ width: TRACK_LABEL_WIDTH, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export interface ReelTimelineProps {
  videoLane: ReelTimelineClip[];
  audioLanes: ReelTimelineAudioLane[];
  onReorderVideo?: (ids: string[]) => void;
  onVideoMuteToggle?: (itemId: string) => void;
  onVideoVolumeChange?: (itemId: string, volume: number) => void;
  onMoveAudioItem?: (laneId: string, itemId: string, start: number) => void;
  onAudioMuteToggle?: (laneId: string, itemId: string) => void;
  onAudioVolumeChange?: (laneId: string, itemId: string, volume: number) => void;
  labels?: Partial<ReelTimelineLabels>;
}

/** Композитный многодорожечный плеер: видео-лейн играет клипы ПОДРЯД (как
 * один непрерывный ролик — только активный клип видим, остальные display:none
 * но всё равно смонтированы, чтобы не терять их <video>-состояние); аудио-
 * лейны — независимо позиционированы, каждый сведён своей громкостью/mute.
 * Вся математика "что сейчас активно" — в timelineMath.ts (чисто, без
 * React/DOM), этот компонент — тонкая обвязка поверх нескольких <video>/
 * <audio> элементов + транспорт (play/pause/скраб/линейка). */
export function ReelTimeline({
  videoLane,
  audioLanes,
  onReorderVideo,
  onVideoMuteToggle,
  onVideoVolumeChange,
  onMoveAudioItem,
  onAudioMuteToggle,
  onAudioVolumeChange,
  labels,
}: ReelTimelineProps) {
  const L = { ...DEFAULT_TIMELINE_LABELS, ...labels };
  const scrubId = useId().replace(/:/g, "");
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const rafRef = useRef<number | null>(null);

  const videoItems: TimelineItem[] = useMemo(
    () => layoutSequential(videoLane.map((c) => ({ id: c.id, duration: durations[c.id] ?? 0 }))),
    [videoLane, durations],
  );
  const audioItemsByLane: TimelineItem[][] = useMemo(
    () => audioLanes.map((lane) => lane.items.map((it) => ({ id: it.id, start: it.start, duration: durations[it.id] ?? 0 }))),
    [audioLanes, durations],
  );
  const duration = totalDuration(videoItems, audioItemsByLane);
  const activeVideo = activeItemAt(videoItems, current);

  // Активный <video> играет/сикается на свою позицию; неактивные — на паузе.
  useEffect(() => {
    for (const clip of videoLane) {
      const el = videoRefs.current[clip.id];
      if (!el) continue;
      el.volume = clip.volume;
      if (activeVideo && clip.id === activeVideo.item.id) {
        if (Math.abs(el.currentTime - activeVideo.offset) > 0.25) el.currentTime = activeVideo.offset;
        if (playing && el.paused) void el.play();
        if (!playing && !el.paused) el.pause();
      } else if (!el.paused) {
        el.pause();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVideo?.item.id, playing, current, videoLane]);

  // Аудио играет независимо от видео-границ — по СВОЕМУ start/duration.
  useEffect(() => {
    for (const lane of audioLanes) {
      for (const item of lane.items) {
        const el = audioRefs.current[item.id];
        if (!el) continue;
        el.volume = item.volume;
        const dur = durations[item.id] ?? 0;
        const within = current >= item.start && current < item.start + dur;
        if (within && playing) {
          const offset = current - item.start;
          if (Math.abs(el.currentTime - offset) > 0.25) el.currentTime = offset;
          if (el.paused) void el.play();
        } else if (!el.paused) {
          el.pause();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, playing]);

  // Общий "плейхед": тикаем через requestAnimationFrame, пока playing.
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCurrent((c) => {
        const next = c + dt;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, duration]);

  function onLoadedMetadata(id: string, el: HTMLMediaElement) {
    setDurations((d) => (d[id] === el.duration ? d : { ...d, [id]: el.duration || 0 }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#0c0c14", borderRadius: 12, padding: 12 }}>
      {/* width задан ЯВНО (180 = 320*9/16) — без неё коробка не имеет ни
          одного определённого измерения: родитель flex-column, а auto-отступы
          margin:"0 auto" отключают дефолтное растяжение по кросс-оси
          (align-items:stretch), так что aspect-ratio не от чего считать
          высоту и бокс схлопывается в 0×0 (видео физически не видно, хотя
          смонтировано и играет). */}
      <div style={{ position: "relative", width: 180, aspectRatio: "9 / 16", maxHeight: 320, margin: "0 auto", background: "#000", borderRadius: 8, overflow: "hidden" }}>
        {videoLane.map((c) => (
          <video
            key={c.id}
            ref={(el) => { videoRefs.current[c.id] = el; }}
            src={c.src}
            muted={c.muted}
            onLoadedMetadata={(e) => onLoadedMetadata(c.id, e.currentTarget)}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
              display: activeVideo?.item.id === c.id ? "block" : "none",
            }}
          />
        ))}
      </div>

      <div style={{ display: "none" }}>
        {audioLanes.flatMap((lane) =>
          lane.items.map((it) => (
            <audio
              key={it.id}
              ref={(el) => { audioRefs.current[it.id] = el; }}
              src={it.src}
              muted={it.muted}
              onLoadedMetadata={(e) => onLoadedMetadata(it.id, e.currentTarget)}
            />
          )),
        )}
      </div>

      {/* тонкий скраб — тот же приём инъекции <style>, что и ReelPreview
          (rk-${scrubId}): нативный range, но перекрашен в тонкую полоску с
          маленьким кружком-держателем — компактнее нативного вида. */}
      <style>{`
        .rk-tl-${scrubId}{-webkit-appearance:none;appearance:none;display:block;width:100%;height:3px;margin:0;padding:0;border-radius:9px;background:rgba(255,255,255,0.14);outline:none;cursor:pointer;vertical-align:middle}
        .rk-tl-${scrubId}::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:9px;height:9px;border-radius:50%;background:#8b5cf6;cursor:grab}
        .rk-tl-${scrubId}::-moz-range-thumb{width:9px;height:9px;border:none;border-radius:50%;background:#8b5cf6;cursor:grab}
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => setPlaying((p) => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", lineHeight: 0 }}>
          {playing ? <Icon.Pause size={16} /> : <Icon.Play size={16} />}
        </button>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>
          {fmt(current, "cs")} / {fmt(duration, "cs")}
        </span>
      </div>

      {/* Единый блок дорожек: линейка + скраб + видео-лейн + аудио-лейны —
          общая геометрия гуттера (TRACK_LABEL_WIDTH/GAP) у всех, поэтому
          поверх можно нарисовать ОДНУ линию-плейхед, которая не разъезжается
          ни с одной дорожкой. paddingTop резервирует место под
          бейдж-таймкод, который едет по линейке вместе с линией. */}
      <div style={{ position: "relative", paddingTop: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <TrackRow label={null}><Ruler duration={duration} /></TrackRow>
          <TrackRow label={null}>
            <input
              type="range"
              className={`rk-tl-${scrubId}`}
              aria-label={L.timeline}
              min={0}
              max={duration || 0}
              step={0.05}
              value={current}
              onChange={(e) => setCurrent(Math.max(0, Math.min(duration, Number(e.target.value))))}
            />
          </TrackRow>
          <VideoLane
            label={L.video}
            items={videoLane.map((c): VideoLaneItem => ({ id: c.id, label: c.label, muted: c.muted, volume: c.volume, duration: durations[c.id] ?? 0 }))}
            duration={duration}
            activeId={activeVideo?.item.id ?? null}
            onReorder={(ids) => onReorderVideo?.(ids)}
            onMuteToggle={(id) => onVideoMuteToggle?.(id)}
            onVolumeChange={(id, v) => onVideoVolumeChange?.(id, v)}
          />
          {audioLanes.map((lane) => (
            <AudioLane
              key={lane.id}
              label={lane.label}
              color={lane.color}
              duration={duration}
              items={lane.items.map((it): AudioLaneItem => ({
                id: it.id, label: it.label, start: it.start, duration: durations[it.id] ?? 0, muted: it.muted, volume: it.volume,
              }))}
              onMove={(itemId, start) => onMoveAudioItem?.(lane.id, itemId, start)}
              onMuteToggle={(itemId) => onAudioMuteToggle?.(lane.id, itemId)}
              onVolumeChange={(itemId, volume) => onAudioVolumeChange?.(lane.id, itemId, volume)}
            />
          ))}
        </div>

        <div aria-hidden style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none" }}>
          <div style={{ width: TRACK_LABEL_WIDTH, flexShrink: 0 }} />
          <div style={{ width: TRACK_LABEL_GAP, flexShrink: 0 }} />
          <div style={{ position: "relative", flex: 1 }}>
            {/* Белая линия с тёмной обводкой (не фиолетовая!) — иначе сливается
                с активным клипом на видео-лейне, у которого тот же акцент. */}
            <div
              style={{
                position: "absolute", top: 14, bottom: 0,
                left: `${duration > 0 ? (current / duration) * 100 : 0}%`,
                width: 2, marginLeft: -1,
                background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 0 6px rgba(0,0,0,0.5)",
              }}
            />
            <div
              style={{
                position: "absolute", top: 0,
                left: `${duration > 0 ? (current / duration) * 100 : 0}%`,
                transform: "translateX(-50%)",
                background: "#fff", color: "#0a0a12", fontSize: 9, fontWeight: 700,
                lineHeight: 1, padding: "2px 5px", borderRadius: 999, whiteSpace: "nowrap",
                boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
              }}
            >
              {Math.round(current)}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
