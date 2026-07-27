import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReelTimeline } from "./ReelTimeline";

// jsdom не реализует настоящее декодирование медиа — .play()/.pause() по
// умолчанию бросают "not implemented". Компонент их вызывает, как только
// playing становится true (клик по Play), поэтому стабим здесь же, локально
// для этого файла (не в глобальном setup — этот стаб нужен только этим тестам).
beforeEach(() => {
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReelTimeline", () => {
  it("рендерит пустые лейны без падения", () => {
    render(<ReelTimeline videoLane={[]} audioLanes={[]} />);
    expect(screen.getByText("0:00.00 / 0:00.00")).toBeInTheDocument();
  });

  it("рендерит клипы видео-лейна и аудио-лейны с подписями", () => {
    render(
      <ReelTimeline
        videoLane={[
          { id: "a1", src: "https://x/a1.mp4", label: "Сцена 1", muted: false, volume: 1 },
          { id: "a2", src: "https://x/a2.mp4", label: "Сцена 2", muted: false, volume: 1 },
        ]}
        audioLanes={[
          { id: "mu", label: "Музыка", color: "#2dd4bf", items: [{ id: "mu1", src: "https://x/mu.mp3", label: "Музыка", start: 0, muted: false, volume: 1 }] },
        ]}
      />,
    );
    expect(screen.getByText("Сцена 1")).toBeInTheDocument();
    expect(screen.getByText("Сцена 2")).toBeInTheDocument();
    expect(screen.getByText("Музыка")).toBeInTheDocument();
  });

  it("перестановка видео-лейна зовёт onReorderVideo", () => {
    const onReorderVideo = vi.fn();
    render(
      <ReelTimeline
        videoLane={[
          { id: "a1", src: "https://x/a1.mp4", label: "1", muted: false, volume: 1 },
          { id: "a2", src: "https://x/a2.mp4", label: "2", muted: false, volume: 1 },
        ]}
        audioLanes={[]}
        onReorderVideo={onReorderVideo}
      />,
    );
    const first = screen.getByText("1");
    const second = screen.getByText("2");
    const spy = vi.spyOn(document, "elementFromPoint").mockReturnValue(second);

    fireEvent.pointerDown(first);
    fireEvent.pointerMove(window);
    fireEvent.pointerUp(window);

    expect(onReorderVideo).toHaveBeenCalledWith(["a2", "a1"]);
    spy.mockRestore();
  });

  it("клик Play переключает playing (иконка Pause появляется)", () => {
    const { container } = render(
      <ReelTimeline videoLane={[{ id: "a1", src: "https://x/a1.mp4", label: "1", muted: false, volume: 1 }]} audioLanes={[]} />,
    );
    const playButton = container.querySelectorAll("button")[0];
    expect(playButton.querySelector("rect")).toBeNull();
    fireEvent.click(playButton);
    expect(playButton.querySelector("rect")).not.toBeNull();
  });

  it("mute/громкость аудио-лейна прокидываются с правильным laneId", () => {
    const onAudioMuteToggle = vi.fn();
    render(
      <ReelTimeline
        videoLane={[]}
        audioLanes={[
          { id: "mu", label: "Музыка", color: "#2dd4bf", items: [{ id: "mu1", src: "https://x/mu.mp3", label: "Музыка", start: 0, muted: false, volume: 1 }] },
        ]}
        onAudioMuteToggle={onAudioMuteToggle}
      />,
    );
    // "Найти кнопку со svg" неоднозначно: у transport play/pause тоже svg-иконка,
    // и он рендерится раньше в DOM. Кнопки лейнов помечены data-nodrag (тот же
    // маркер, что VideoLane/AudioLane используют, чтобы клик по ним не начинал
    // драг) — это и есть уникальный признак именно mute-кнопки аудио-элемента.
    fireEvent.click(screen.getAllByRole("button").find((b) => b.hasAttribute("data-nodrag"))!);
    expect(onAudioMuteToggle).toHaveBeenCalledWith("mu", "mu1");
  });
});
