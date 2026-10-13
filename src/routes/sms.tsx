import { createFileRoute } from "@tanstack/react-router";
import { SmsLanding } from "@/components/sms/SmsLanding";

export const Route = createFileRoute("/sms")({
  head: () => ({
    meta: [
      { title: "KodarAI SMS — Virtual Numbers" },
      { name: "description", content: "Browse available virtual numbers and manage SMS in one KodarAI account." },
    ],
  }),
  component: SmsLanding,
});
