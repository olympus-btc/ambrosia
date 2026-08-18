import { CopyButton } from "@/components/shared/CopyButton";

export function HashRow({ label, value, copyLabel }) {
  const truncated = `${value.slice(0, 12)}…${value.slice(-8)}`;
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-gray-700" title={value}>{truncated}</span>
        <CopyButton value={value} label={copyLabel} size="sm" />
      </div>
    </div>
  );
}
