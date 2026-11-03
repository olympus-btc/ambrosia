import { CopyButton } from "@/components/shared/CopyButton";

const TRUNCATE_THRESHOLD = 20;

export function CopyableValueRow({ label, fullValue, copyLabel }) {
  const displayValue = fullValue.length > TRUNCATE_THRESHOLD
    ? `${fullValue.slice(0, 12)}…${fullValue.slice(-8)}`
    : fullValue;
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-gray-700" title={fullValue}>{displayValue}</span>
        <CopyButton value={fullValue} label={copyLabel} size="sm" />
      </div>
    </div>
  );
}
