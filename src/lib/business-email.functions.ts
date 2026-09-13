import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasPaidSubscription, paidPlanRequired } from "@/lib/subscription.server";

const LOOKUP_CATEGORY = "__business_email_lookup__";
const inputSchema = z.object({ websiteUrl: z.string().url().max(2_000) });
const emailPattern = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi;

function validatePublicUrl(input: string): URL {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS websites can be checked.');
  const host = url.hostname.toLowerCase();
  const privateHost = host === 'localhost' || host === '0.0.0.0' || host === '::1' || host === 'metadata.google.internal' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost');
  if (privateHost) throw new Error('That website cannot be checked.');
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168) throw new Error('That website cannot be checked.');
  }
  return url;
}

async function fetchPublicHtml(startUrl: URL): Promise<{ html: string; finalUrl: URL }> {
  let url = startUrl;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, {
        redirect: 'manual', signal: controller.signal,
        headers: { 'User-Agent': 'KodaraiBot/1.0 (+https://kodarai.xyz)', Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location || redirects === 3) throw new Error('The website redirected too many times.');
        url = validatePublicUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) throw new Error('The website could not be reached.');
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new Error('That link is not a website page.');
      const length = Number(response.headers.get('content-length') ?? 0);
      if (length > 1_500_000) throw new Error('That website page is too large to check.');
      const html = await response.text();
      if (html.length > 1_500_000) throw new Error('That website page is too large to check.');
      return { html, finalUrl: url };
    } finally { clearTimeout(timeout); }
  }
  throw new Error('The website could not be reached.');
}

export function extractPublicBusinessEmail(html: string, websiteUrl: URL): string | null {
  const candidates = new Set<string>();
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ');
  for (const match of withoutScripts.matchAll(emailPattern)) candidates.add(match[0].toLowerCase());
  for (const match of withoutScripts.matchAll(/mailto:([^"'\s?#>]+)/gi)) {
    let value = '';
    try { value = decodeURIComponent(match[1]).trim().toLowerCase(); } catch { continue; }
    emailPattern.lastIndex = 0;
    const email = value.match(emailPattern)?.[0];
    emailPattern.lastIndex = 0;
    if (email) candidates.add(email);
  }
  const host = websiteUrl.hostname.replace(/^www\./, '').toLowerCase();
  return [...candidates]
    .filter((email) => email && email.length <= 254 && !email.endsWith('@example.com'))
    .sort((a, b) => score(b) - score(a))[0] ?? null;

  function score(email: string) {
    const [local, domain] = email.split('@');
    return (domain === host || domain.endsWith(`.${host}`) ? 100 : 0) + (/^(info|hello|contact|sales|support|enquiries|admin)$/i.test(local) ? 20 : 0) - (/^(no-?reply|mailer-daemon)$/i.test(local) ? 50 : 0);
  }
}

export const findBusinessEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) return paidPlanRequired();
    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count } = await supabaseAdmin.from('search_logs').select('id', { count: 'exact', head: true }).eq('user_id', context.userId).eq('category', LOOKUP_CATEGORY).gte('created_at', since);
    if ((count ?? 0) >= 30) return { error: 'rate_limited', message: 'You can check up to 30 business websites per hour. Please try again later.' } as const;
    const websiteUrl = validatePublicUrl(data.websiteUrl);
    await supabaseAdmin.from('search_logs').insert({ user_id: context.userId, category: LOOKUP_CATEGORY, location: websiteUrl.hostname, results_count: 0 });
    try {
      const { html, finalUrl } = await fetchPublicHtml(websiteUrl);
      return { email: extractPublicBusinessEmail(html, finalUrl) } as const;
    } catch (error) {
      console.error('Business email lookup failed:', error);
      return { error: 'lookup_failed', message: error instanceof Error ? error.message : 'We could not check that website.' } as const;
    }
  });
