/** Общие тайм-функции reelkit: форматирование таймкода и разметка линейки —
 * используются и ReelPreview (одиночный клип), и ReelTimeline (монтаж
 * нескольких клипов), поэтому вынесены сюда, а не продублированы. */

export function fmt(s: number, precision: "cs" | "ms"): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const fracDigits = precision === "ms" ? 3 : 2;
  const frac = Math.floor((s % 1) * (precision === "ms" ? 1000 : 100))
    .toString()
    .padStart(fracDigits, "0");
  return `${m}:${sec.toString().padStart(2, "0")}.${frac}`;
}

export interface TimeMark {
  pos: number;
  major: boolean;
  label: string | null;
}

/** Риски линейки: выбираем «крупный» шаг (секунды) так, чтобы их было ≤10,
 * мелкий — пятая доля крупного. Крупные подписываем `m:ss`. Позиция в % от
 * длительности. */
export function computeMarks(duration: number): TimeMark[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const majorCand = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  let major = majorCand[majorCand.length - 1];
  for (const c of majorCand) {
    if (duration / c <= 10) { major = c; break; }
  }
  const minor = major / 5;
  const marks: TimeMark[] = [];
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
