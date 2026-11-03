"use client";

import { findTaskByName } from "../utils/taskSelector";

export function useTaskSelector({ tasks, taskName, onTaskChange, canCreateTask }) {
  const typedTaskName = taskName.trim();
  const isNewTaskName = Boolean(typedTaskName) && !findTaskByName(tasks, typedTaskName);

  const handleInputChange = (nextTaskName) => {
    onTaskChange({ taskName: nextTaskName, taskId: findTaskByName(tasks, nextTaskName)?.id ?? "" });
  };

  const handleSelectionChange = (selectedTaskId) => {
    const selectedTask = tasks.find((task) => task.id === String(selectedTaskId));
    if (selectedTask) onTaskChange({ taskName: selectedTask.name, taskId: selectedTask.id });
  };

  return {
    typedTaskName,
    willCreateTask: isNewTaskName && canCreateTask,
    isUnknownTask: isNewTaskName && !canCreateTask,
    handleInputChange,
    handleSelectionChange,
  };
}
