export const CHANGE_EVENT = "lajesfit-backend-change";

export function notifyChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}
