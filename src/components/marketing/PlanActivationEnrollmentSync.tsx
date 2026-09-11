import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { recordPlanActivationEnrollment } from "@/lib/plan-activation.functions";

export function PlanActivationEnrollmentSync() {
  const { user, loading } = useAuth();
  const recordEnrollment = useServerFn(recordPlanActivationEnrollment);
  const recordedUsers = useRef(new Set<string>());

  useEffect(() => {
    if (loading || !user || recordedUsers.current.has(user.id)) return;

    recordedUsers.current.add(user.id);
    void recordEnrollment().catch((error) => {
      console.error("Unable to record plan activation enrollment:", error);
    });
  }, [loading, recordEnrollment, user]);

  return null;
}
