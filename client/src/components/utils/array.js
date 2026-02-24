export function toArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}
