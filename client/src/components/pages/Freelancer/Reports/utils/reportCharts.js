const MAX_CHART_ITEMS = 8;

function addDuration(durationsByKey, durationKey, name, durationMinutes) {
  const currentDuration = durationsByKey.get(durationKey);
  durationsByKey.set(durationKey, {
    name,
    durationMinutes: (currentDuration?.durationMinutes ?? 0) + durationMinutes,
  });
}

function toTopDurations(durationsByKey) {
  return [...durationsByKey.values()]
    .sort((firstDuration, secondDuration) => secondDuration.durationMinutes - firstDuration.durationMinutes)
    .slice(0, MAX_CHART_ITEMS);
}

export function buildReportChartData(report) {
  const projectDurations = new Map();
  const clientDurations = new Map();
  const taskDurations = new Map();

  (report?.currencies ?? []).forEach((currencyGroup) => {
    currencyGroup.projects.forEach((project) => {
      addDuration(projectDurations, project.projectId, project.projectName, project.durationMinutes);
      addDuration(clientDurations, project.clientId, project.clientName, project.durationMinutes);
      project.tasks.forEach((task) => addDuration(taskDurations, task.taskId, task.taskName, task.durationMinutes));
    });
  });

  return {
    durationByProject: toTopDurations(projectDurations),
    durationByClient: toTopDurations(clientDurations),
    durationByTask: toTopDurations(taskDurations),
  };
}
