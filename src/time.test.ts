import { describe, it, expect } from "vitest";
import { fmt, computeMarks } from "./time";

describe("fmt", () => {
  it("форматирует сотые по умолчанию: m:ss.cc", () => {
    expect(fmt(3.24, "cs")).toBe("0:03.24");
  });
  it("форматирует миллисекунды: m:ss.mmm", () => {
    expect(fmt(3.24, "ms")).toBe("0:03.240");
  });
  it("минуты считаются отдельно от секунд", () => {
    expect(fmt(65.5, "cs")).toBe("1:05.50");
  });
  it("отрицательное/не-число -> 0", () => {
    expect(fmt(-5, "cs")).toBe("0:00.00");
    expect(fmt(NaN, "cs")).toBe("0:00.00");
  });
});

describe("computeMarks", () => {
  it("пустой список для нулевой/некорректной длительности", () => {
    expect(computeMarks(0)).toEqual([]);
    expect(computeMarks(-3)).toEqual([]);
    expect(computeMarks(NaN)).toEqual([]);
  });
  it("крупные риски подписаны, мелкие — нет", () => {
    const marks = computeMarks(10); // major=1 (10/1<=10), minor=0.2
    const majors = marks.filter((m) => m.major);
    const minors = marks.filter((m) => !m.major);
    expect(majors.length).toBeGreaterThan(0);
    expect(majors.every((m) => m.label !== null)).toBe(true);
    expect(minors.every((m) => m.label === null)).toBe(true);
  });
  it("позиция последней риски примерно 100%", () => {
    const marks = computeMarks(10);
    expect(marks[marks.length - 1].pos).toBeCloseTo(100, 0);
  });
});
