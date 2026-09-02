const appUrl = process.env.APP_URL?.replace(/\/$/, "");
const secret = process.env.FOLLOW_UP_REMINDER_CRON_SECRET;

if (!appUrl || !secret) {
  throw new Error("APP_URL and FOLLOW_UP_REMINDER_CRON_SECRET must be set for follow-up reminders.");
}

const response = await fetch(`${appUrl}/api/public/follow-up-reminders/due`, {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` },
});

if (!response.ok) {
  throw new Error(`Follow-up reminder request failed (${response.status}): ${await response.text()}`);
}

console.log(await response.text());
