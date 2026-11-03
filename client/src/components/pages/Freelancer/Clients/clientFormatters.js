export function getClientCurrencyAcronym(client, currencies) {
  return currencies.find((currency) => currency.id === client.currencyId)?.acronym || "";
}

export function formatClientHourlyRate(client, currencyAcronym) {
  const hourlyRateAmount = (client.hourlyRateCents ?? 0) / 100;
  return `${currencyAcronym} ${hourlyRateAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getClientPaymentMethods(client) {
  return client.paymentMethods?.length ? client.paymentMethods : [client.paymentMethod].filter(Boolean);
}
