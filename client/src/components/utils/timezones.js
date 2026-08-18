function getUtcOffsetLabel(zoneId) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zoneId,
    timeZoneName: "shortOffset",
  });
  const offsetPart = formatter.formatToParts(new Date()).find((part) => part.type === "timeZoneName");
  return offsetPart ? offsetPart.value : "";
}

function buildTimezoneLabel(zoneId) {
  const readableZoneId = zoneId.replace(/_/g, " ");
  const offsetLabel = getUtcOffsetLabel(zoneId);
  return offsetLabel ? `${readableZoneId} (${offsetLabel})` : readableZoneId;
}

export const TIMEZONES = Intl.supportedValuesOf("timeZone")
  .map((zoneId) => ({ zoneId, label: buildTimezoneLabel(zoneId) }))
  .sort((firstTimezone, secondTimezone) => firstTimezone.zoneId.localeCompare(secondTimezone.zoneId));
