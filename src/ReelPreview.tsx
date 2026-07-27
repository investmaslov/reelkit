import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Подписи (i18n) — англ. по умолчанию, потребитель переопределяет. */
export interface ReelPreviewLabels {
  play: string;
  pause: string;
  mute: string;
  unmute: string;
  fullscreen: string;
  prevFrame: string;
  nextFrame: string;
  timeline: string;
}

const DEFAULT_LABELS: ReelPreviewLabels = {
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  fullscreen: "Fullscreen",
  prevFrame: "Previous frame",
  nextFrame: "Next frame",
  timeline: "Timeline",
};

export interface ReelPreviewProps {
  /** Источник видео (mp4/webm или объектный URL). */
  src: string;
  /** Кадр-постер до старта воспроизведения. */
  poster?: string;
  /** Класс контейнера — им задают кадр/размер (напр. aspect-ratio 9/16, max-height). */
  className?: string;
  /** Инлайн-стиль контейнера (сливается со встроенными). */
  style?: CSSProperties;
  /** Акцентный цвет (заливка ползунка, кнопки). По умолчанию — мягкий фиолетовый. */
  accent?: string;
  /** Кадров в секунду — шаг покадровых стрелок (1/fps). По умолчанию 30. */
  fps?: number;
  /** Точность таймера: "cs" — сотые (0:03.24, по умолчанию), "ms" — миллисекунды (0:03.240). */
  precision?: "cs" | "ms";
  /** Как вписывать видео в контейнер:
   *  - `false` (по умолчанию): контейнер задаёт кадр (через className aspect/height),
   *    видео заполняет его с `object-fit: contain` — стабильная рамка (напр. 9:16);
   *  - `true`: высоту задаёт САМО видео по своему аспекту (контейнер подстраивается) —
   *    для мест, где рамка заранее неизвестна и нужен «естественный» размер. */
  natural?: boolean;
  /** Линейка-таймкод над скрабом: крупные риски на секундах (с подписью `m:ss`)
   *  и мелкие на долях секунды — как у профи-редакторов. По умолчанию включена. */
  ruler?: boolean;
  /** Расположение панели управления:
   *  - `"overlay"` (по умолчанию): поверх видео снизу, на градиенте — компактно;
   *  - `"panel"`: ОТДЕЛЬНОЙ панелью ПОД видео (своя тёмная расцветка) — не наезжает
   *    на кадр, удобно в узких карточках. */
  controls?: "overlay" | "panel";
  /** Радиус скругления контейнера, px. По умолчанию 14; передай 0 для прямых углов. */
  radius?: number;
  /** Переопределение подписей (aria/title). */
  labels?: Partial<ReelPreviewLabels>;
}

function fmt(s: number, precision: "cs" | "ms"): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const fracDigits = precision === "ms" ? 3 : 2;
  const frac = Math.floor((s % 1) * (precision === "ms" ? 1000 : 100))
    .toString()
    .padStart(fracDigits, "0");
  return `${m}:${sec.toString().padStart(2, "0")}.${frac}`;
}

/** Риски линейки: выбираем «крупный» шаг (секунды) так, чтобы их было ≤10, мелкий —
 *  пятая доля крупного. Крупные подписываем `m:ss`. Позиция в % от длительности. */
function computeMarks(duration: number): { pos: number; major: boolean; label: string | null }[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const majorCand = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  let major = majorCand[majorCand.length - 1];
  for (const c of majorCand) {
    if (duration / c <= 10) { major = c; break; }
  }
  const minor = major / 5;
  const marks: { pos: number; major: boolean; label: string | null }[] = [];
  const n = Math.floor(duration / minor + 1e-6);
  for (let i = 0; i <= n; i++) {
    const t = i * minor;
    const isMajor = i % 5 === 0;
    const mm = Math.floor(t / 60);
    const ss = Math.floor(t % 60);
    marks.push({
      pos: (t / duration) * 100,
      major: isMajor,
      label: isMajor ? `${mm}:${ss.toString().padStart(2, "0")}` : null,
    });
  }
  return marks;
}

/** Линейка-таймкод: тонкие риски во всю ширину, крупные — на секундах с подписью. */
function Ruler({ duration }: { duration: number }) {
  const marks = computeMarks(duration);
  return (
    <div aria-hidden style={{ position: "relative", height: 15, width: "100%" }}>
      {marks.map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${m.pos}%`,
            bottom: 0,
            width: 1,
            height: m.major ? 9 : 5,
            background: m.major ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.22)",
          }}
        >
          {m.label != null && (
            <span
              style={{
                position: "absolute",
                bottom: 10,
                left: 0,
                transform: m.pos < 4 ? "translateX(0)" : m.pos > 96 ? "translateX(-100%)" : "translateX(-50%)",
                fontSize: 8,
                lineHeight: 1,
                color: "rgba(255,255,255,0.55)",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {m.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const BTN: CSSProperties = {
  display: "grid",
  placeItems: "center",
  background: "transparent",
  border: "none",
  padding: 0,
  color: "#fff",
  cursor: "pointer",
  lineHeight: 0,
  opacity: 0.9,
};

/** Минималистичный вертикальный плеер ролика со своим таймлайном: покадровые
 * стрелки, play/pause, тонкий ползунок-скраб, суб-секундный таймер, звук,
 * фуллскрин. Self-contained (только React + инлайн-стили) — работает у любого
 * потребителя без Tailwind/CSS-импорта. */
export function ReelPreview({
  src,
  poster,
  className,
  style,
  accent = "#8b5cf6",
  fps = 30,
  precision = "cs",
  natural = false,
  ruler = true,
  controls = "overlay",
  radius = 14,
  labels,
}: ReelPreviewProps) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const ref = useRef<HTMLVideoElement>(null);
  const scrubId = useId().replace(/:/g, "");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  const seek = (value: number) => {
    const v = ref.current;
    if (v) v.currentTime = value;
    setCurrent(value);
  };
  const step = (dir: 1 | -1) => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(duration || v.duration || 0, v.currentTime + dir / fps));
  };
  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;
  const panel = controls === "panel";

  // Панель управления (линейка + скраб + кнопки) — одинакова в обоих режимах;
  // различается только обёртка: оверлей на градиенте либо отдельная панель снизу.
  const controlsInner = (
    <>
      {ruler && duration > 0 && <Ruler duration={duration} />}
      <input
        type="range"
        className={`rk-${scrubId}`}
        aria-label={L.timeline}
        min={0}
        max={duration || 0}
        step={0.001}
        value={current}
        onChange={(e) => seek(Number(e.target.value))}
        style={{ width: "100%", background: `linear-gradient(90deg, ${accent} ${pct}%, rgba(255,255,255,0.22) ${pct}%)` }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff" }}>
        <button type="button" aria-label={L.prevFrame} title={L.prevFrame} onClick={() => step(-1)} style={BTN}>
          <Icon.StepBack size={15} />
        </button>
        <button type="button" aria-label={playing ? L.pause : L.play} onClick={toggle} style={BTN}>
          {playing ? <Icon.Pause size={17} /> : <Icon.Play size={17} />}
        </button>
        <button type="button" aria-label={L.nextFrame} title={L.nextFrame} onClick={() => step(1)} style={BTN}>
          <Icon.StepForward size={15} />
        </button>
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontSize: 11,
            letterSpacing: "0.02em",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {fmt(current, precision)} / {fmt(duration, precision)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" aria-label={muted ? L.unmute : L.mute} onClick={toggleMute} style={BTN}>
            {muted ? <Icon.VolumeOff size={16} /> : <Icon.Volume size={16} />}
          </button>
          <button type="button" aria-label={L.fullscreen} onClick={() => ref.current?.requestFullscreen?.()} style={BTN}>
            <Icon.Fullscreen size={15} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        background: "#000",
        ...(panel ? { display: "flex", flexDirection: "column" } : {}),
        ...style,
      }}
    >
      {/* тонкий скраб — псевдоэлементы через инъекцию <style> (инлайн их не умеет) */}
      <style>{`
        .rk-${scrubId}{-webkit-appearance:none;appearance:none;height:4px;border-radius:9px;outline:none;cursor:pointer}
        .rk-${scrubId}::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:11px;height:11px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px ${accent}66;cursor:grab}
        .rk-${scrubId}::-moz-range-thumb{width:11px;height:11px;border:none;border-radius:50%;background:#fff;box-shadow:0 0 0 3px ${accent}66;cursor:grab}
      `}</style>

      {/* кадр видео + центральная кнопка Play (+ оверлей-контролы в режиме overlay) */}
      <div style={{ position: "relative", ...(panel ? {} : { height: "100%" }) }}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
        style={
          natural
            ? { width: "100%", height: "auto", display: "block" }
            : { height: "100%", width: "100%", objectFit: "contain", display: "block" }
        }
      />

      {!playing && (
        <button
          type="button"
          aria-label={L.play}
          onClick={toggle}
          style={{ ...BTN, position: "absolute", inset: 0, opacity: 1 }}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Icon.Play size={24} style={{ marginLeft: 2 }} />
          </span>
        </button>
      )}

        {!panel && (
          <div
            style={{
              position: "absolute",
              insetInline: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "22px 12px 10px",
              background: "linear-gradient(to top, rgba(0,0,0,0.82), transparent)",
            }}
          >
            {controlsInner}
          </div>
        )}
      </div>

      {panel && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "8px 12px 10px",
            background: "#12121a",
            borderTop: `1px solid ${accent}2e`,
          }}
        >
          {controlsInner}
        </div>
      )}
    </div>
  );
}

// ── Инлайн-иконки (без внешних зависимостей) ────────────────────────────────
type IconProps = { size?: number; style?: CSSProperties };
const svg = (size: number, style: CSSProperties | undefined, children: ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    aria-hidden
  >
    {children}
  </svg>
);
const Icon = {
  Play: ({ size = 16, style }: IconProps) =>
    svg(size, style, <path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" />),
  Pause: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>),
  StepBack: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><path d="M18 5v14l-9-7z" fill="currentColor" stroke="none" /><line x1="6" y1="5" x2="6" y2="19" /></>),
  StepForward: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><path d="M6 5v14l9-7z" fill="currentColor" stroke="none" /><line x1="18" y1="5" x2="18" y2="19" /></>),
  Volume: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none" /><path d="M16 8a5 5 0 010 8" /></>),
  VolumeOff: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none" /><line x1="16" y1="9" x2="21" y2="15" /><line x1="21" y1="9" x2="16" y2="15" /></>),
  Fullscreen: ({ size = 16, style }: IconProps) =>
    svg(size, style, <path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" />),
};
