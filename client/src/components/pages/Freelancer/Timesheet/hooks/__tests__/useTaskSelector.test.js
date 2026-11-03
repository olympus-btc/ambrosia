import { act, renderHook } from "@testing-library/react";

import { useTaskSelector } from "../useTaskSelector";

const tasks = [
  { id: "development-id", name: "Development" },
  { id: "design-id", name: "Design" },
];

function renderUseTaskSelector(hookOptions = {}) {
  const onTaskChange = jest.fn();
  const renderedTaskSelectorHook = renderHook(() => useTaskSelector({
    tasks,
    taskName: "",
    onTaskChange,
    canCreateTask: true,
    ...hookOptions,
  }));
  return { ...renderedTaskSelectorHook, onTaskChange };
}

describe("useTaskSelector", () => {
  it("keeps a typed name without a task id when no task has that name", () => {
    const { result: taskSelectorHook, onTaskChange } = renderUseTaskSelector();

    act(() => taskSelectorHook.current.handleInputChange("Code review"));

    expect(onTaskChange).toHaveBeenCalledWith({ taskName: "Code review", taskId: "" });
  });

  it("resolves a typed name to the existing task ignoring case and spaces", () => {
    const { result: taskSelectorHook, onTaskChange } = renderUseTaskSelector();

    act(() => taskSelectorHook.current.handleInputChange("  development "));

    expect(onTaskChange).toHaveBeenCalledWith({ taskName: "  development ", taskId: "development-id" });
  });

  it("selects an existing task from the suggestions", () => {
    const { result: taskSelectorHook, onTaskChange } = renderUseTaskSelector();

    act(() => taskSelectorHook.current.handleSelectionChange("design-id"));

    expect(onTaskChange).toHaveBeenCalledWith({ taskName: "Design", taskId: "design-id" });
  });

  it("ignores a cleared selection so the typed name is kept", () => {
    const { result: taskSelectorHook, onTaskChange } = renderUseTaskSelector();

    act(() => taskSelectorHook.current.handleSelectionChange(null));

    expect(onTaskChange).not.toHaveBeenCalled();
  });

  it("announces that a new task will be created when the name is new", () => {
    const { result: taskSelectorHook } = renderUseTaskSelector({ taskName: "  Code review " });

    expect(taskSelectorHook.current.typedTaskName).toBe("Code review");
    expect(taskSelectorHook.current.willCreateTask).toBe(true);
    expect(taskSelectorHook.current.isUnknownTask).toBe(false);
  });

  it("does not announce a new task when the name already exists", () => {
    const { result: taskSelectorHook } = renderUseTaskSelector({ taskName: "DESIGN" });

    expect(taskSelectorHook.current.willCreateTask).toBe(false);
    expect(taskSelectorHook.current.isUnknownTask).toBe(false);
  });

  it("marks a new name as unknown without the create permission", () => {
    const { result: taskSelectorHook } = renderUseTaskSelector({ taskName: "Code review", canCreateTask: false });

    expect(taskSelectorHook.current.willCreateTask).toBe(false);
    expect(taskSelectorHook.current.isUnknownTask).toBe(true);
  });
});
