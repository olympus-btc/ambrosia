export function MetaField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <div className="font-medium">{value}</div>
    </div>
  );
}
