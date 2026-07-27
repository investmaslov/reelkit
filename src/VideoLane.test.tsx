import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VideoLane } from "./VideoLane";

describe("VideoLane", () => {
  it("рендерит все клипы по label", () => {
    render(
      <VideoLane
        items={[{ id: "a", label: "1", muted: false, volume: 1 }, { id: "b", label: "2", muted: false, volume: 1 }]}
        activeId={null}
        onReorder={vi.fn()}
        onMuteToggle={vi.fn()}
        onVolumeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("перетаскивание клипа A на клип C вызывает onReorder с новым порядком", () => {
    const onReorder = vi.fn();
    render(
      <VideoLane
        items={[
          { id: "a", label: "1", muted: false, volume: 1 },
          { id: "b", label: "2", muted: false, volume: 1 },
          { id: "c", label: "3", muted: false, volume: 1 },
        ]}
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
        items={[{ id: "a", label: "1", muted: false, volume: 1 }, { id: "b", label: "2", muted: false, volume: 1 }]}
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
        items={[{ id: "a", label: "1", muted: false, volume: 1 }]}
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
        items={[{ id: "a", label: "1", muted: false, volume: 1 }, { id: "b", label: "2", muted: false, volume: 1 }]}
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
