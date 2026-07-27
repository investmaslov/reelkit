import { describe, it, expect } from "vitest";
import { activeItemAt, layoutSequential, totalDuration } from "./timelineMath";

describe("layoutSequential", () => {
  it("раскладывает клипы подряд: start каждого = сумма длительностей предыдущих", () => {
    const result = layoutSequential([
      { id: "a", duration: 3 },
      { id: "b", duration: 5 },
      { id: "c", duration: 2 },
    ]);
    expect(result).toEqual([
      { id: "a", duration: 3, start: 0 },
      { id: "b", duration: 5, start: 3 },
      { id: "c", duration: 2, start: 8 },
    ]);
  });

  it("пустой список -> пустой результат", () => {
    expect(layoutSequential([])).toEqual([]);
  });
});

describe("activeItemAt", () => {
  const items = layoutSequential([{ id: "a", duration: 3 }, { id: "b", duration: 5 }]);

  it("находит элемент, покрывающий момент t, и смещение внутри него", () => {
    const result = activeItemAt(items, 4);
    expect(result?.item.id).toBe("b");
    expect(result?.offset).toBe(1); // 4 - start(b)=3
  });

  it("t на самой границе принадлежит СЛЕДУЮЩЕМУ элементу (start включительно)", () => {
    expect(activeItemAt(items, 3)?.item.id).toBe("b");
  });

  it("t за пределами последнего элемента -> null", () => {
    expect(activeItemAt(items, 100)).toBeNull();
  });

  it("пустой список -> null", () => {
    expect(activeItemAt([], 0)).toBeNull();
  });
});

describe("totalDuration", () => {
  it("берёт максимум конца видео-лейна и всех аудио-элементов", () => {
    const video = layoutSequential([{ id: "a", duration: 3 }, { id: "b", duration: 5 }]); // ends at 8
    const audioLanes = [
      [{ id: "mu", start: 0, duration: 4 }], // ends at 4
      [{ id: "vo", start: 6, duration: 10 }], // ends at 16 <- max
    ];
    expect(totalDuration(video, audioLanes)).toBe(16);
  });

  it("нет клипов вообще -> 0", () => {
    expect(totalDuration([], [])).toBe(0);
  });
});
