import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "./time";
import { Ruler } from "./Ruler";
import { Icon } from "./icons";
import { VideoLane, type VideoLaneItem } from "./VideoLane";
import { AudioLane, type AudioLaneItem } from "./AudioLane";
import { activeItemAt, layoutSequential, totalDuration, type TimelineItem } from "./timelineMath";

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

export interface ReelTimelineProps {
  videoLane: ReelTimelineClip[];
  audioLanes: ReelTimelineAudioLane[];
  onReorderVideo?: (ids: string[]) => void;
  onVideoMuteToggle?: (itemId: string) => void;
  onVideoVolumeChange?: (itemId: string, volume: number) => void;
  onMoveAudioItem?: (laneId: string, itemId: string, start: number) => void;
  onAudioMuteToggle?: (laneId: string, itemId: string) => void;
  onAudioVolumeChange?: (laneId: string, itemId: string, volume: number) => void;
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
}: ReelTimelineProps) {
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
  }, [activeVideo?.item.id, playing]);

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
      <div style={{ position: "relative", aspectRatio: "9 / 16", maxHeight: 320, margin: "0 auto", background: "#000", borderRadius: 8, overflow: "hidden" }}>
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

      <Ruler duration={duration} />

      <input
        type="range"
        aria-label="Позиция"
        min={0}
        max={duration || 0}
        step={0.05}
        value={current}
        onChange={(e) => setCurrent(Math.max(0, Math.min(duration, Number(e.target.value))))}
        style={{ width: "100%" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={() => setPlaying((p) => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
          {playing ? <Icon.Pause size={18} /> : <Icon.Play size={18} />}
        </button>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums" }}>
          {fmt(current, "cs")} / {fmt(duration, "cs")}
        </span>
      </div>

      <VideoLane
        items={videoLane.map((c): VideoLaneItem => ({ id: c.id, label: c.label, muted: c.muted, volume: c.volume }))}
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
  );
}
