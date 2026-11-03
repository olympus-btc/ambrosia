import { fireEvent, render, screen } from "@testing-library/react";

import { DurationInput } from "../DurationInput";

function renderDurationInput(durationInputPropOverrides = {}) {
  const onDurationChange = jest.fn();
  render(<DurationInput durationMinutes={null} onDurationChange={onDurationChange} {...durationInputPropOverrides} />);
  return { onDurationChange, durationInput: screen.getByLabelText(/modal.durationLabel/) };
}

describe("DurationInput", () => {
  const originalPointerEvent = window.PointerEvent;

  beforeAll(() => {
    window.PointerEvent = window.PointerEvent ?? MouseEvent;
  });

  afterAll(() => {
    window.PointerEvent = originalPointerEvent;
  });

  it("shows the initial duration formatted", () => {
    const { durationInput } = renderDurationInput({ durationMinutes: 75 });

    expect(durationInput).toHaveValue("1:15");
  });

  it("emits the duration snapped to quarter hours while typing", () => {
    const { onDurationChange, durationInput } = renderDurationInput();

    fireEvent.change(durationInput, { target: { value: "1:20" } });

    expect(onDurationChange).toHaveBeenLastCalledWith(75);
  });

  it("formats the snapped duration on blur", () => {
    const { durationInput } = renderDurationInput();

    fireEvent.change(durationInput, { target: { value: "1.6" } });
    fireEvent.blur(durationInput);

    expect(durationInput).toHaveValue("1:30");
  });

  it("emits null and flags invalid input on blur", () => {
    const { onDurationChange, durationInput } = renderDurationInput();

    fireEvent.change(durationInput, { target: { value: "abc" } });
    fireEvent.blur(durationInput);

    expect(onDurationChange).toHaveBeenLastCalledWith(null);
    expect(durationInput).toHaveAttribute("aria-invalid", "true");
  });

  it("adds time in quarter hours when dragging the handle up", () => {
    const { onDurationChange, durationInput } = renderDurationInput({ durationMinutes: 60 });
    const durationDragHandle = screen.getByRole("slider", { name: "modal.adjustDuration" });

    fireEvent.pointerDown(durationDragHandle, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(durationDragHandle, { clientY: 75, pointerId: 1 });
    expect(durationInput).toHaveValue("1:30");
    fireEvent.pointerUp(durationDragHandle, { clientY: 75, pointerId: 1 });

    expect(durationInput).toHaveValue("1:30");
    expect(onDurationChange).toHaveBeenLastCalledWith(90);
  });

  it("adjusts the duration by fifteen minutes with the arrow keys", () => {
    const { onDurationChange, durationInput } = renderDurationInput({ durationMinutes: 60 });
    const durationDragHandle = screen.getByRole("slider", { name: "modal.adjustDuration" });

    fireEvent.keyDown(durationDragHandle, { key: "ArrowUp" });
    expect(onDurationChange).toHaveBeenLastCalledWith(75);

    fireEvent.keyDown(durationDragHandle, { key: "ArrowDown" });
    fireEvent.keyDown(durationDragHandle, { key: "ArrowDown" });
    expect(durationInput).toHaveValue("0:45");
    expect(onDurationChange).toHaveBeenLastCalledWith(45);
  });

  it("does not go below fifteen minutes when dragging down", () => {
    const { durationInput } = renderDurationInput({ durationMinutes: 15 });
    const durationDragHandle = screen.getByRole("slider", { name: "modal.adjustDuration" });

    fireEvent.pointerDown(durationDragHandle, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(durationDragHandle, { clientY: 600, pointerId: 1 });
    fireEvent.pointerUp(durationDragHandle, { clientY: 600, pointerId: 1 });

    expect(durationInput).toHaveValue("0:15");
  });

  it("starts dragging from fifteen minutes when the field is empty", () => {
    const { onDurationChange, durationInput } = renderDurationInput();

    fireEvent.keyDown(screen.getByRole("slider", { name: "modal.adjustDuration" }), { key: "ArrowUp" });

    expect(durationInput).toHaveValue("0:30");
    expect(onDurationChange).toHaveBeenLastCalledWith(30);
  });
});
