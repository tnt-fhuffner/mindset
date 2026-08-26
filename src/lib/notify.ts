export function queueEmailNotify(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  void fetch("/api/notify/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
