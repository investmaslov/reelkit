import { computeMarks } from "./time";

/** Линейка-таймкод: тонкие риски во всю ширину, крупные — на секундах с
 * подписью. Общая для ReelPreview (один клип) и ReelTimeline (монтаж). */
export function Ruler({ duration }: { duration: number }) {
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
