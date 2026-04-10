import { resolveValue } from "./resolveValue";

export function ElementText({ localId, value, config, className }) {
  return (
    <div key={localId} className={className}>
      {resolveValue(value || "", config)}
    </div>
  );
}
