import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioLane } from "./AudioLane";

const ITEM = { id: "vo1", label: "Озвучка", start: 2, duration: 4, muted: false, volume: 1 };

describe("AudioLane", () => {
  it("рендерит подпись лейна и элемент", () => {
    render(
      <AudioLane label="Озвучка монтажа" color="#ec4899" items={[ITEM]} duration={10} onMove={vi.fn()} onMuteToggle={vi.fn()} onVolumeChange={vi.fn()} />,
    );
    expect(screen.getByText("Озвучка монтажа")).toBeInTheDocument();
  });

  it("клик по mute вызывает onMuteToggle с id элемента", () => {
    const onMuteToggle = vi.fn();
    render(
      <AudioLane label="L" color="#ec4899" items={[ITEM]} duration={10} onMove={vi.fn()} onMuteToggle={onMuteToggle} onVolumeChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onMuteToggle).toHaveBeenCalledWith("vo1");
  });

  it("изменение громкости вызывает onVolumeChange с id и новым значением", () => {
    const onVolumeChange = vi.fn();
    render(
      <AudioLane label="L" color="#ec4899" items={[ITEM]} duration={10} onMove={vi.fn()} onMuteToggle={vi.fn()} onVolumeChange={onVolumeChange} />,
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.4" } });
    expect(onVolumeChange).toHaveBeenCalledWith("vo1", 0.4);
  });

  it("клик по mute/громкости НЕ вызывает onMove", () => {
    const onMove = vi.fn();
    render(
      <AudioLane label="L" color="#ec4899" items={[ITEM]} duration={10} onMove={onMove} onMuteToggle={vi.fn()} onVolumeChange={vi.fn()} />,
    );
    fireEvent.pointerDown(screen.getByRole("button"));
    fireEvent.pointerMove(window);
    fireEvent.pointerUp(window);
    expect(onMove).not.toHaveBeenCalled();
  });
});
