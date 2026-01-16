export function dispatchAuthEvent(eventName, detail = null) {
  if (typeof window !== "undefined") {
    const event = detail
      ? new CustomEvent(eventName, { detail })
      : new Event(eventName);
    window.dispatchEvent(event);
  }
}
