/**
 * One-time patch: apply SQL that was skipped because earlier migrations
 * had "already exists" errors on tables/types created in a prior run.
 */
import pg from "pg";

const client = new pg.Client({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: "postgres.hpfirxvqvyfnijocohga",
  password: "high)Jg@gxV-447",
  ssl: { rejectUnauthorized: false },
});

const steps = [
  {
    name: "use_search_credit() function",
    sql: `
CREATE OR REPLACE FUNCTION public.use_search_credit()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  sub public.subscriptions%ROWTYPE;
  v_total int;
  v_used int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id) VALUES (v_uid) RETURNING * INTO sub;
  END IF;

  v_total := sub.search_credits_total;
  v_used  := sub.search_credits_used;

  IF now() >= sub.credits_reset_at THEN
    v_used := 0;
    UPDATE public.subscriptions
      SET search_credits_used = 0, credits_reset_at = now() + interval '1 month'
      WHERE user_id = v_uid;
  END IF;

  IF v_used >= v_total THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'total', v_total);
  END IF;

  UPDATE public.subscriptions SET search_credits_used = v_used + 1 WHERE user_id = v_uid;
  RETURN jsonb_build_object('allowed', true, 'remaining', v_total - v_used - 1, 'total', v_total);
END; $$;`,
  },
  {
    name: "set_updated_at() search_path pin",
    sql: `ALTER FUNCTION public.set_updated_at() SET search_path = public;`,
  },
  {
    name: "revoke trigger functions from public",
    sql: `
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;`,
  },
  {
    name: "grant use_search_credit to authenticated",
    sql: `
REVOKE ALL ON FUNCTION public.use_search_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_search_credit() TO authenticated;`,
  },
];

console.log("\nConnecting to Supabase...");
await client.connect();
console.log("✓ Connected\n");

for (const step of steps) {
  process.stdout.write(`Applying: ${step.name} ... `);
  try {
    await client.query(step.sql);
    console.log("✓");
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log("⚠ skipped (already exists)");
    } else {
      console.log(`✗\n\nError: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }
}

await client.end();
console.log("\n✓ Patch complete.");
