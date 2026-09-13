/** Client-safe subscription access helpers. Server enforcement remains in server functions. */
export function hasPaidPlan(status: string | null | undefined): boolean {
  return status === "active" || status === "canceling";
}

export function isPreviewMode(status: string | null | undefined): boolean {
  return status === "pending_plan";
}
