export function normalizeTaskName(taskName) {
  return taskName.trim().toLocaleLowerCase();
}

export function findTaskByName(tasks, taskName) {
  const normalizedTaskName = normalizeTaskName(taskName);
  if (!normalizedTaskName) return null;
  return tasks.find((task) => normalizeTaskName(task.name) === normalizedTaskName) ?? null;
}
