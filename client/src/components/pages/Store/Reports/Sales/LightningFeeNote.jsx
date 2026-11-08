export function LightningFeeNote({ label, feeSat, className = "text-xs text-gray-400" }) {
  if (!(feeSat > 0)) return null;

  return (
    <p className={className}>
      {label}: {feeSat} sats
    </p>
  );
}
