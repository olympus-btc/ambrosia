export function getProjectClientName(project, clients, unknownClientLabel) {
  return clients.find((client) => client.id === project.clientId)?.name || unknownClientLabel;
}

export function formatProjectHourlyRate(project, noRateOverrideLabel) {
  if (project.hourlyRateCents === null || project.hourlyRateCents === undefined) {
    return noRateOverrideLabel;
  }

  const hourlyRateAmount = project.hourlyRateCents / 100;
  return hourlyRateAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
