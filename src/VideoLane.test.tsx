import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VideoLane } from "./VideoLane";

function item(id: string, label: string, duration: number) {
  return { id, label, muted: false, volume: 1, duration };
}

describe("VideoLane", () => {
  it("рендерит подпись дорожки и все клипы по label", () => {
    render(
      <VideoLane
        label="Видео"
        items={[item("a", "1", 5), item("b", "2", 5)]}
        duration={10}
        activeId={null}
        onReorder={vi.fn()}
        onMuteToggle={vi.fn()}
        onVolumeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Видео")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("ширина пилюли пропорциональна длительности клипа, а не поровну", () => {
    const { container } = render(
      <VideoLane
        label="Видео"
        items={[item("a", "1", 2), item("b", "2", 8)]}
        duration={10}
        activeId={null}
        onReorder={vi.fn()}
        onMuteToggle={vi.fn()}
        onVolumeChange={vi.fn()}
      />,
    );
    const a = container.querySelector('[data-clip-id="a"]') as HTMLElement;
    const b = container.querySelector('[data-clip-id="b"]') as HTMLElement;
    // a = 2/10 = 20% (ниже пола MIN_PCT_WIDTH=6%, значение не проверяем точно —
    // важно, что b СУЩЕСТВЕННО шире a, т.е. раскладка не поровну).
    expect(a.style.left).toBe("0%");
    expect(b.style.left).toBe("20%");
    expect(parseFloat(b.style.width)).toBeGreaterThan(parseFloat(a.style.width));
  });

  it("перетаскивание клипа A на клип C вызывает onReorder с новым порядком", () => {
    const onReorder = vi.fn();
    render(
      <VideoLane
        label="Видео"
        items={[item("a", "1", 5), item("b", "2", 5), item("c", "3", 5)]}
        duration={15}
        activeId={null}
        onReorder={onReorder}
        onMuteToggle={vi.fn()}
        onVolumeChange={vi.fn()}
      />,
    );
    const a = screen.getByText("1");
    const c = screen.getByText("3");
    // jsdom не считает реальный layout — elementFromPoint замокан под жест.
    const spy = vi.spyOn(document, "elementFromPoint").mockReturnValue(c);

    fireEvent.pointerDown(a);
    fireEvent.pointerMove(window);
    fireEvent.pointerUp(window);

    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a"]);
    spy.mockRestore();
  });

  it("если отпустили на том же клипе — onReorder не зовётся", () => {
    const onReorder = vi.fn();
    render(
      <VideoLane
        label="Видео"
        items={[item("a", "1", 5), item("b", "2", 5)]}
        duration={10}
        activeId={null}
        onReorder={onReorder}
        onMuteToggle={vi.fn()}
        onVolumeChange={vi.fn()}
      />,
    );
    const a = screen.getByText("1");
    const spy = vi.spyOn(document, "elementFromPoint").mockReturnValue(a);

    fireEvent.pointerDown(a);
    fireEvent.pointerMove(window);
    fireEvent.pointerUp(window);

    expect(onReorder).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("клик по mute вызывает onMuteToggle и НЕ вызывает onReorder", () => {
    const onMuteToggle = vi.fn();
    const onReorder = vi.fn();
    render(
      <VideoLane
        label="Видео"
        items={[item("a", "1", 5)]}
        duration={5}
        activeId={null}
        onReorder={onReorder}
        onMuteToggle={onMuteToggle}
        onVolumeChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onMuteToggle).toHaveBeenCalledWith("a");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("pointerdown на mute-кнопке не начинает драг (guard data-nodrag реально отрабатывает)", () => {
    const onReorder = vi.fn();
    render(
      <VideoLane
        label="Видео"
        items={[item("a", "1", 5), item("b", "2", 5)]}
        duration={10}
        activeId={null}
        onReorder={onReorder}
        onMuteToggle={vi.fn()}
        onVolumeChange={vi.fn()}
      />,
    );
    const muteButton = screen.getAllByRole("button")[0];
    const b = screen.getByText("2");
    const spy = vi.spyOn(document, "elementFromPoint").mockReturnValue(b);

    fireEvent.pointerDown(muteButton);
    fireEvent.pointerMove(window);
    fireEvent.pointerUp(window);

    expect(onReorder).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
