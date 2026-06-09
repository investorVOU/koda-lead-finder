# Kodarai AI Builder Prompt

You are building KodaRai (kodarai.xyz) — a SaaS lead generation 
platform for web designers. The core product already exists with 
the following features already built:

- Lead generation (finds local businesses without websites via 
  Google Places API)
- AI-powered cold outreach generation (Claude API)
- Virtual Phone Numbers module (Twilio + SMSPool, wallet system, 
  dynamic FX pricing)
- Auth (Supabase)
- Billing (Stripe + Paystack dual gateway)
- Dashboard UI

You are now adding a new module called "Studio" — an AI-powered 
website builder that lets web designers build sites for their 
clients directly inside KodaRai.

I am importing the builder UI files from a separate Replit project 
into this repo. Your job is to:
1. Integrate those imported files cleanly into the existing KodaRai 
   codebase without breaking anything
2. Build all missing backend logic, API routes, and database schema
3. Wire the Studio module into the existing nav, billing, and auth

---

## EXISTING TECH STACK (do not change these)
- Framework: Next.js 15 App Router
- Language: TypeScript (strict)
- Styling: Tailwind CSS + shadcn/ui
- Auth + DB: Supabase (SSR with @supabase/ssr)
- Payments: Stripe (USD) + Paystack (NGN)
- AI: currently Claude API — Studio will use Gemini + Groq
- Hosting: Vercel

---

## INTEGRATION TASK 1 — Import Builder UI Files

The imported builder UI files from Replit will be placed in:
  src/app/app/studio/          (pages)
  src/components/studio/       (components)

On import, do the following for each file:
- Replace any hardcoded API keys or env vars with references to 
  process.env.*
- Replace any standalone auth logic with the existing KodaRai 
  Supabase auth (src/lib/supabase/server.ts and 
  src/lib/supabase/client.ts)
- Replace any standalone billing/plan checks with the existing 
  KodaRai plan system (check users.plan field in Supabase)
- Replace any standalone DB calls with the existing Supabase 
  typed client
- Ensure all imports resolve correctly within the monorepo
- Fix any TypeScript errors introduced by the import
- Remove any duplicate dependencies already in package.json

---

## INTEGRATION TASK 2 — Add Studio to Navigation

In the existing KodaRai dashboard sidebar and top nav, add:

  Leads          (existing)
  Outreach       (existing)
  Phone Numbers  (existing)
  Studio    ✨   (new — badge "New")

Route: /app/studio

On the Leads page, add a "Build their site →" button on each 
closed/contacted lead card. Clicking it opens the Studio builder 
at /app/studio/new?leadId=[id] with the following pre-populated 
in the prompt:

  "Build a professional website for [business name], a [category] 
   business located in [city]. Their phone number is [phone] and 
   they currently have no website."

---

## INTEGRATION TASK 3 — Database Schema

Run these as new Supabase migrations. Do not modify existing tables.

-- Studio projects
create table public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  name text not null,
  description text,
  template text default 'blank',
  snapshot_path text,
  thumbnail_url text,
  deployment_url text,
  custom_domain text,
  status text default 'draft' 
    check (status in ('draft','building','live','error')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Studio messages (chat history per project)
create table public.studio_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.studio_projects(id) 
    on delete cascade,
  role text check (role in ('user','assistant')),
  content text not null,
  file_changes jsonb,
  created_at timestamptz default now()
);

-- Studio project snapshots (version history)
create table public.studio_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.studio_projects(id) 
    on delete cascade,
  snapshot_path text not null,
  message_id uuid references public.studio_messages(id),
  label text,
  created_at timestamptz default now()
);

-- Custom domains
create table public.studio_domains (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.studio_projects(id) 
    on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  domain text not null unique,
  vercel_project_id text,
  status text default 'pending' 
    check (status in ('pending','active','error')),
  dns_records jsonb,
  verified_at timestamptz,
  created_at timestamptz default now()
);

Enable RLS on all new tables.
Policies: users can only read/write rows where user_id = auth.uid()

Add studio_builds column to existing usage table:
  alter table public.usage 
    add column if not exists studio_builds int default 0;

---

## INTEGRATION TASK 4 — Plan Limits

Extend existing plan limit checks to include Studio:

  Starter (existing free/entry plan):
    studio_projects: 3 max
    studio_builds (AI generations): 20/month
    publish: kodarai.site subdomain only
    custom_domain: ✗

  Pro (₦29,000/mo | $19/mo):
    studio_projects: unlimited
    studio_builds: 200/month
    publish: kodarai.site subdomain
    custom_domain: ✗

  Agency (₦75,000/mo | $49/mo):
    studio_projects: unlimited
    studio_builds: unlimited
    publish: kodarai.site subdomain
    custom_domain: ✓ (up to 10 domains)
    white_label: ✓ (remove KodaRai branding from published sites)

Update pricing page and billing settings to reflect new plan names 
and Studio features. Update the Stripe + Paystack product IDs in 
env vars for the new plans.

---

## INTEGRATION TASK 5 — AI Code Generation Engine

Install:
  npm install @ai-sdk/google @ai-sdk/groq

Add to .env.local:
  GOOGLE_GENERATIVE_AI_API_KEY=    # aistudio.google.com (free)
  GROQ_API_KEY=                    # console.groq.com (free)

Create src/lib/studio-ai.ts:

  import { google } from '@ai-sdk/google';
  import { createGroq } from '@ai-sdk/groq';
  import { streamText } from 'ai';

  const groq = createGroq({ 
    apiKey: process.env.GROQ_API_KEY 
  });

  export function selectModel(ctx: {
    totalTokens: number;
    isFirstMessage: boolean;
    messageType: 'full_build' | 'edit' | 'chat' | 'fix';
  }) {
    // Large context — Gemini's 1M window
    if (ctx.totalTokens > 80_000) {
      return google('gemini-2.0-flash');
    }
    // First gen or full build — Gemini quality
    if (ctx.isFirstMessage || ctx.messageType === 'full_build') {
      return google('gemini-2.0-flash');
    }
    // Quick edits and fixes — Groq speed
    if (ctx.messageType === 'edit' || ctx.messageType === 'fix') {
      return groq('llama-3.3-70b-versatile');
    }
    // General chat — Groq
    return groq('llama-3.3-70b-versatile');
  }

  export async function streamWithFallback(
    options: Parameters<typeof streamText>[0]
  ) {
    try {
      return streamText(options);
    } catch (err: any) {
      const isRateLimit = 
        err?.status === 429 || 
        err?.message?.includes('rate');
      if (isRateLimit && options.model !== groq('llama-3.3-70b-versatile')) {
        console.warn('Primary rate limited, falling back to Groq');
        return streamText({ 
          ...options, 
          model: groq('llama-3.3-70b-versatile') 
        });
      }
      throw err;
    }
  }

  export function buildSystemPrompt(
    files: Record<string, string>,
    currentFile?: string,
    leadContext?: {
      businessName: string;
      category: string;
      city: string;
      phone?: string;
    }
  ): string {
    const manifest = Object.keys(files)
      .filter(p => p !== currentFile)
      .map(p => `- ${p}`)
      .join('\n');

    const currentFileBlock = currentFile && files[currentFile]
      ? `\nCurrently open file — ${currentFile}:\n\`\`\`\n${files[currentFile]}\n\`\`\``
      : '';

    const leadBlock = leadContext
      ? `\nClient context:\n- Business: ${leadContext.businessName}\n- Type: ${leadContext.category}\n- Location: ${leadContext.city}\n- Phone: ${leadContext.phone ?? 'N/A'}`
      : '';

    return `You are the KodaRai Studio AI — an expert web designer 
and developer specializing in building websites for local businesses.

Your output is always clean, professional HTML/CSS/JS or 
React + Tailwind sites. Sites must look credible and conversion-focused 
— not like templates.
${leadBlock}

When asked to build or modify, respond with file changes in this 
exact XML format:

<file_changes>
  <file path="index.html" action="create">
    [complete file content — never partial]
  </file>
  <file path="styles.css" action="update">
    [complete file content]
  </file>
  <file path="old.js" action="delete"></file>
</file_changes>

After the XML block, write a short plain-English summary of changes.

Rules:
- Always write COMPLETE file contents, never diffs
- For simple sites: use semantic HTML + CSS + vanilla JS (no framework)
- For complex apps: use React + TypeScript + Tailwind
- Sites must be mobile-first and responsive
- No placeholder lorem ipsum — generate realistic content for the 
  business type
- Include real meta tags, og:image placeholders, and favicon link
- All images: use Unsplash URLs relevant to the business type

Project files:
${manifest}
${currentFileBlock}`;
  }

Create API route: src/app/api/studio/generate/route.ts

  import { createClient } from '@/lib/supabase/server';
  import { selectModel, streamWithFallback, buildSystemPrompt } 
    from '@/lib/studio-ai';
  import { z } from 'zod';

  const schema = z.object({
    projectId: z.string().uuid(),
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })),
    files: z.record(z.string(), z.string()),
    currentFile: z.string().optional(),
    messageType: z.enum(['full_build','edit','chat','fix'])
      .default('edit'),
    totalTokens: z.number().default(0),
    isFirstMessage: z.boolean().default(false),
    leadContext: z.object({
      businessName: z.string(),
      category: z.string(),
      city: z.string(),
      phone: z.string().optional(),
    }).optional(),
  });

  const PLAN_LIMITS = {
    starter: 20,
    pro: 200,
    agency: Infinity,
  };

  export async function POST(req: Request) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();

    const month = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from('usage')
      .select('studio_builds')
      .eq('user_id', user.id)
      .eq('month', month)
      .single();

    const currentBuilds = usage?.studio_builds ?? 0;
    const limit = PLAN_LIMITS[profile?.plan ?? 'starter'];

    if (currentBuilds >= limit) {
      return Response.json(
        { 
          error: 'limit_reached', 
          upgradeUrl: '/app/settings/billing',
          message: `You've used all ${limit} Studio generations this month.`
        },
        { status: 402 }
      );
    }

    const body = schema.parse(await req.json());
    const model = selectModel(body);
    const system = buildSystemPrompt(
      body.files, 
      body.currentFile,
      body.leadContext
    );

    const result = streamWithFallback({
      model,
      system,
      messages: body.messages,
      onFinish: async ({ text }) => {
        await supabase.from('studio_messages').insert({
          project_id: body.projectId,
          role: 'assistant',
          content: text,
          file_changes: extractMeta(text),
        });

        await supabase.from('usage').upsert({
          user_id: user.id,
          month,
          studio_builds: currentBuilds + 1,
        }, { onConflict: 'user_id,month' });

        await saveSnapshot(body.projectId, body.files, supabase);
      },
    });

    return (await result).toDataStreamResponse();
  }

  function extractMeta(text: string) {
    return [...text.matchAll(
      /<file path="([^"]+)" action="([^"]+)">/g
    )].map(m => ({ path: m[1], action: m[2] }));
  }

  async function saveSnapshot(
    projectId: string,
    files: Record<string, string>,
    supabase: any
  ) {
    const path = `studio/${projectId}/snapshot.json`;
    const blob = new Blob(
      [JSON.stringify(files)], 
      { type: 'application/json' }
    );
    await supabase.storage
      .from('studio-snapshots')
      .upload(path, blob, { upsert: true });
    await supabase
      .from('studio_projects')
      .update({ 
        snapshot_path: path, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', projectId);
  }

---

## INTEGRATION TASK 6 — Publishing

Add to next.config.ts (required for WebContainers):
  async headers() {
    return [{
      source: '/app/studio/:path*',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      ],
    }];
  }

Add env vars:
  FORGE_VERCEL_TOKEN=       # your Vercel team token
  FORGE_VERCEL_TEAM_ID=     # your Vercel team ID
  NEXT_PUBLIC_PUBLISH_DOMAIN=kodarai.site

Create API route: src/app/api/studio/publish/route.ts

  Publish flow:
  1. Receive: { projectId }
  2. Load files from Supabase Storage snapshot
  3. POST to Vercel Deployments API with files + FORGE_VERCEL_TOKEN
  4. Poll deployment until state === 'READY' (max 120s, poll every 3s)
  5. Save deployment_url to studio_projects
  6. Update status to 'live'
  7. Return: { url }

  Published URL format: [project-slug].kodarai.site
  (configure wildcard DNS: *.kodarai.site → Vercel)

Create API route: src/app/api/studio/domains/route.ts

  POST /api/studio/domains/add
    { projectId, domain }
    - Check user is on Agency plan, else return 403
    - Check user has < 10 custom domains
    - Call Vercel API to add domain to project
    - Save to studio_domains with status 'pending'
    - Return DNS records for user to configure

  POST /api/studio/domains/verify
    { domainId }
    - Call Vercel domain status API
    - If verified: update status to 'active'
    - Return { verified, error? }

  DELETE /api/studio/domains/[domainId]
    - Call Vercel API to remove domain
    - Delete from studio_domains

---

## INTEGRATION TASK 7 — Studio Pages

### /app/studio (Studio dashboard)

Layout: matches existing KodaRai dashboard style exactly

Content:
- Header: "Studio" + "New project" button (right)
- Usage bar: "X of Y AI generations used this month" 
  (pulls from usage table)
- Projects grid (same card style as rest of KodaRai):
  - Project name, status badge, last edited, 
    deployment URL chip if live
  - Hover: Edit button + Preview button + "..." menu 
    (rename, duplicate, delete)
- Empty state: "No projects yet. Build your first client site →"
  with a prominent CTA

### /app/studio/new (New project)

Two-column layout:

Left — Start from prompt:
  - Textarea: "Describe the website you're building…" 
    (Geist Mono, auto-resize)
  - If ?leadId= in URL: auto-populate with lead context + 
    show lead card above textarea: 
    "[Business name] · [Category] · [City]"
  - Template gallery below textarea:
    6 cards: Blank | Restaurant | Salon/Spa | Contractor | 
    Retail Shop | Professional Services
    Each card: name, 1-line description, preview thumbnail
  - "Start building" button

Right — Recent leads (quick-start):
  - List of last 10 contacted/closed leads from leads table
  - Each row: business name, category, city, 
    "Build site →" button

### /app/studio/[projectId] (Builder)

This is the imported builder UI from Replit.
Integrate it with all the API routes above.

Ensure:
- Top bar shows KodaRai logo (not standalone Forge branding)
- Back button goes to /app/studio
- Project name syncs to studio_projects.name
- Publish button calls /api/studio/publish
- Deploy URL shown in top bar after publish
- Version history tab calls studio_snapshots table
- Usage limit errors show inline upgrade card pointing to 
  /app/settings/billing

---

## INTEGRATION TASK 8 — Settings Updates

In /app/settings/billing:
- Update plan cards to show Studio features per tier
- Add Studio usage bar alongside existing usage metrics

Add new tab to settings: "Domains" (/app/settings/domains)
  - Table: Domain | Project | Status | SSL | Added | Delete
  - "Add domain" button (Agency plan only, else show upgrade prompt)
  - DNS instructions modal (show records returned from Vercel API)
  - Auto-verify toggle (polls every 30s)
  - Agency plan users only. Others see: 
    "Custom domains are available on the Agency plan" 
    + upgrade CTA

---

## ENVIRONMENT VARIABLES (full list, add new ones)

# Existing (do not change)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
NEXT_PUBLIC_APP_URL=

# New — Studio AI
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=

# New — Publishing
FORGE_VERCEL_TOKEN=
FORGE_VERCEL_TEAM_ID=
NEXT_PUBLIC_PUBLISH_DOMAIN=kodarai.site

# New — Encryption (for domain tokens)
ENCRYPTION_KEY=

---

## BUILD ORDER

Execute in this exact sequence to avoid breaking existing features:

1. Add new env vars to .env.local and Vercel dashboard
2. Run Supabase migrations (new tables only)
3. Add COOP/COEP headers to next.config.ts 
   (scoped to /app/studio/* only)
4. Install new dependencies: @ai-sdk/google @ai-sdk/groq
5. Create src/lib/studio-ai.ts
6. Import builder UI files from Replit into 
   src/components/studio/ and src/app/app/studio/
7. Fix imports, auth references, and TypeScript errors 
   in imported files
8. Create /api/studio/generate route
9. Create /api/studio/publish route
10. Create /api/studio/domains routes
11. Build /app/studio dashboard page
12. Build /app/studio/new page
13. Wire /app/studio/[projectId] to new API routes
14. Add Studio to existing nav sidebar
15. Add "Build their site →" button to Leads page
16. Update billing/settings pages with Studio tiers
17. Add Domains tab to settings
18. Test full flow: Lead → Build → Publish → Custom domain
19. Fix any regressions in existing Leads, Outreach, 
    and Phone Numbers modules

---

## CRITICAL CONSTRAINTS

- Do NOT modify existing table schemas
- Do NOT change existing API routes
- Do NOT change existing auth flow
- Do NOT change existing billing webhooks
- All new routes must be under /api/studio/* namespace
- All new DB tables must be prefixed studio_
- The Studio module must be fully removable without 
  affecting the rest of the app
- TypeScript strict mode — no `any`, validate all API 
  inputs with Zod
- All Supabase queries use the typed client 
  (generate types: supabase gen types typescript)