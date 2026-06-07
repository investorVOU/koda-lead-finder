import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/landing/SiteNav";
import { SiteFooter } from "@/components/landing/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — KodaRai" },
      { name: "description", content: "Read the Privacy Policy for KodaRai." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <div className="mb-10">
          <p className="text-sm font-medium text-primary">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-muted-foreground">
            Last updated: <time dateTime="2026-06-07">7 June 2026</time>
          </p>
        </div>

        <div className="max-w-none space-y-8 text-foreground [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted-foreground [&_li]:leading-relaxed">

          <p>
            KodaRai ("we", "our", "us") is committed to protecting your personal information. This
            Privacy Policy explains what data we collect, how we use it, and your rights regarding
            that data when you use our website at{" "}
            <a href="https://kodarai.xyz" className="text-primary underline underline-offset-4">kodarai.xyz</a>.
          </p>

          <h2>1. Information We Collect</h2>
          <p>We collect information in the following ways:</p>
          <ul>
            <li>
              <strong className="font-medium text-foreground">Account information</strong> — name,
              email address, and password when you register.
            </li>
            <li>
              <strong className="font-medium text-foreground">Profile data</strong> — optional
              information such as your company, niche, target location, and profile photo.
            </li>
            <li>
              <strong className="font-medium text-foreground">Usage data</strong> — searches
              performed, leads saved, subscription plan, and credit usage.
            </li>
            <li>
              <strong className="font-medium text-foreground">Payment data</strong> — billing
              details are processed by our payment providers (Stripe / Paystack). We do not store
              full card numbers.
            </li>
            <li>
              <strong className="font-medium text-foreground">Device & log data</strong> — IP
              address, browser type, pages visited, and timestamps, collected automatically.
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide, maintain, and improve the Service.</li>
            <li>To process payments and manage your subscription.</li>
            <li>To personalise AI-generated prompts and scripts to your business details.</li>
            <li>To send transactional emails (receipts, password resets, product updates).</li>
            <li>To detect, prevent, and address fraud and security issues.</li>
            <li>To analyse usage trends and improve user experience.</li>
          </ul>

          <h2>3. Data Sharing</h2>
          <p>
            We do not sell your personal data. We may share data with trusted third parties only as
            necessary:
          </p>
          <ul>
            <li>
              <strong className="font-medium text-foreground">Supabase</strong> — database and
              authentication infrastructure.
            </li>
            <li>
              <strong className="font-medium text-foreground">Stripe / Paystack</strong> — payment
              processing.
            </li>
            <li>
              <strong className="font-medium text-foreground">OpenAI / Anthropic</strong> — AI
              content generation (only business metadata is sent; no personal user data).
            </li>
            <li>
              <strong className="font-medium text-foreground">Legal obligations</strong> — we may
              disclose data if required by law or to protect our legal rights.
            </li>
          </ul>

          <h2>4. Cookies & Tracking</h2>
          <p>
            We use essential cookies to maintain your session and authentication state. We do not use
            advertising or tracking cookies. You can disable cookies in your browser settings, though
            this may affect functionality.
          </p>

          <h2>5. Data Storage & Security</h2>
          <p>
            Your data is stored on Supabase infrastructure hosted in the EU (eu-west-1). We implement
            industry-standard security measures including encryption in transit (TLS) and at rest, and
            row-level security policies. Despite these measures, no system is completely secure, and
            we cannot guarantee absolute security.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide the
            Service. If you delete your account, we will delete your personal data within 30 days,
            except where retention is required by law.
          </p>

          <h2>7. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data.</li>
            <li>Request deletion of your data ("right to be forgotten").</li>
            <li>Object to or restrict certain processing.</li>
            <li>Data portability — receive your data in a machine-readable format.</li>
          </ul>
          <p>
            To exercise any of these rights, please{" "}
            <Link to="/contact" className="text-primary underline underline-offset-4">contact us</Link>.
            We will respond within 30 days.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            The Service is not directed at children under 18. We do not knowingly collect personal
            data from anyone under 18. If you believe we have done so inadvertently, please contact
            us immediately and we will delete the data.
          </p>

          <h2>9. International Transfers</h2>
          <p>
            Your data may be processed in countries outside your own. Where we transfer data
            internationally, we take steps to ensure appropriate safeguards are in place in accordance
            with applicable data protection laws.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by posting the updated policy and revising the "Last updated" date. Your continued
            use of the Service after changes constitutes acceptance of the updated policy.
          </p>

          <h2>11. Contact</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please{" "}
            <Link to="/contact" className="text-primary underline underline-offset-4">contact us</Link>{" "}
            or email us at{" "}
            <a href="mailto:hello@kodarai.xyz" className="text-primary underline underline-offset-4">
              hello@kodarai.xyz
            </a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
