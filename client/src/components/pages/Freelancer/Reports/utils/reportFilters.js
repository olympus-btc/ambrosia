function sortByName(firstOption, secondOption) {
  return firstOption.name.localeCompare(secondOption.name);
}

export function buildReportFilterOptions(report) {
  const clientsById = new Map();
  const projectsById = new Map();

  (report?.currencies ?? []).forEach((currencyGroup) => {
    currencyGroup.projects.forEach((project) => {
      clientsById.set(project.clientId, { id: project.clientId, name: project.clientName });
      projectsById.set(project.projectId, { id: project.projectId, name: project.projectName, clientId: project.clientId });
    });
  });

  return {
    clients: [...clientsById.values()].sort(sortByName),
    projects: [...projectsById.values()].sort(sortByName),
  };
}

function includesSearchTerm(text, searchTerm) {
  return text.toLocaleLowerCase().includes(searchTerm);
}

function sumBy(items, fieldName) {
  return items.reduce((fieldSum, item) => fieldSum + item[fieldName], 0);
}

function filterProject(project, { clientId, projectId }, searchTerm) {
  if (clientId && project.clientId !== clientId) return null;
  if (projectId && project.projectId !== projectId) return null;
  if (!searchTerm || includesSearchTerm(project.projectName, searchTerm) || includesSearchTerm(project.clientName, searchTerm)) {
    return project;
  }

  const matchingTasks = project.tasks.filter((task) => includesSearchTerm(task.taskName, searchTerm));
  if (matchingTasks.length === 0) return null;

  return {
    ...project,
    tasks: matchingTasks,
    durationMinutes: sumBy(matchingTasks, "durationMinutes"),
    amountCents: sumBy(matchingTasks, "amountCents"),
  };
}

export function filterReport(report, reportFilters) {
  const searchTerm = reportFilters.search.trim().toLocaleLowerCase();
  if (!report || (!searchTerm && !reportFilters.clientId && !reportFilters.projectId)) return report;

  const filteredCurrencyGroups = report.currencies
    .map((currencyGroup) => {
      const filteredProjects = currencyGroup.projects
        .map((project) => filterProject(project, reportFilters, searchTerm))
        .filter(Boolean);
      return {
        ...currencyGroup,
        projects: filteredProjects,
        totalDurationMinutes: sumBy(filteredProjects, "durationMinutes"),
        totalAmountCents: sumBy(filteredProjects, "amountCents"),
      };
    })
    .filter((currencyGroup) => currencyGroup.projects.length > 0);

  return { ...report, currencies: filteredCurrencyGroups };
}
