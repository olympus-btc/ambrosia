const CENTS_PER_UNIT = 100;
const SATOSHIS_PER_BTC = 100000000;
const BITCOIN_CURRENCY_ACRONYM = "BTC";

async function convertCurrencyGroupToSatoshis(currencyGroup, getBitcoinPrice) {
  const currencyAmount = currencyGroup.totalAmountCents / CENTS_PER_UNIT;
  if (currencyGroup.currencyAcronym.toUpperCase() === BITCOIN_CURRENCY_ACRONYM) {
    return Math.round(currencyAmount * SATOSHIS_PER_BTC);
  }

  const bitcoinPrice = await getBitcoinPrice(currencyGroup.currencyAcronym.toLowerCase());
  return Math.round((currencyAmount / bitcoinPrice) * SATOSHIS_PER_BTC);
}

export async function calculateReportTotalSatoshis(currencyGroups, getBitcoinPrice) {
  const currencyGroupSatoshis = await Promise.all(
    currencyGroups.map((currencyGroup) => convertCurrencyGroupToSatoshis(currencyGroup, getBitcoinPrice)),
  );

  return currencyGroupSatoshis.reduce((totalSatoshis, groupSatoshis) => totalSatoshis + groupSatoshis, 0);
}

export function formatSatoshis(satoshis) {
  return `${satoshis.toLocaleString()} sats`;
}
