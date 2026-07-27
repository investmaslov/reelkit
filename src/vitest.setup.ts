// jest-dom матчеры (toBeInTheDocument и т.п.) для компонентных тестов на RTL.
import "@testing-library/jest-dom/vitest";

// jsdom не реализует document.elementFromPoint вовсе (ни как метод, ни как
// "not implemented"-заглушку) — из-за этого vi.spyOn(document, "elementFromPoint")
// падает с "property is not defined", т.к. спаить нечего. Добавляем no-op,
// чтобы тесты pointer-based драга (VideoLane и другие) могли подменять его моком.
// (typeof-проверка, а не "in" — иначе TS сужает document до never в negative-ветке,
// т.к. elementFromPoint формально объявлен в типах lib.dom.)
if (typeof document.elementFromPoint !== "function") {
  document.elementFromPoint = () => null;
}
