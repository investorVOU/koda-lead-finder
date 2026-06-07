import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/landing/SiteNav";
import { SiteFooter } from "@/components/landing/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Kodarai" },
      { name: "description", content: "Read the Terms of Service for Kodarai." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to home
        </Link>
        <div className="mb-10">
          <p className="text-sm font-medium text-primary">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-muted-foreground">
            Last updated: <time dateTime="2026-06-07">7 June 2026</time>
          </p>
        </div>

        <div className="prose prose-sm sm:prose-base max-w-none space-y-8 text-foreground [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted-foreground [&_li]:leading-relaxed">

          <p>
            Welcome to Kodarai ("we", "our", "us"). By accessing or using our website at{" "}
            <a href="https://kodarai.xyz" className="text-primary underline underline-offset-4">kodarai.xyz</a>{" "}
            and any related services (collectively the "Service"), you agree to be bound by these Terms of Service.
            If you do not agree, please do not use the Service.
          </p>

          <h2>1. Eligibility</h2>
          <p>
            You must be at least 18 years old to use Kodarai. By using the Service you represent and
            warrant that you meet this requirement and that you have the legal capacity to enter into a
            binding agreement.
          </p>

          <h2>2. Account Registration</h2>
          <p>
            You may be required to create an account to access certain features. You agree to provide
            accurate, current, and complete information and to keep it updated. You are responsible for
            maintaining the confidentiality of your credentials and for all activity that occurs under
            your account.
          </p>

          <h2>3. Subscriptions & Payments</h2>
          <p>
            Kodarai offers both free trial and paid subscription plans. By purchasing a plan you
            authorise us to charge the applicable fees to your chosen payment method. All fees are
            stated in USD unless otherwise specified. We also accept Naira payments via Paystack.
          </p>
          <ul>
            <li>Subscriptions renew automatically at the end of each billing cycle.</li>
            <li>You may cancel at any time; cancellation takes effect at the end of the current paid period.</li>
            <li>We do not issue refunds for partial subscription periods unless required by applicable law.</li>
            <li>We reserve the right to change pricing with 30 days' notice.</li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
            <li>Scrape, reverse-engineer, or reproduce any part of the Service without written permission.</li>
            <li>Transmit spam, malware, or any harmful code.</li>
            <li>Attempt to gain unauthorised access to any systems or accounts.</li>
            <li>Resell or sublicense access to the Service without prior written consent.</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            All content, branding, and software included in the Service are owned by or licensed to
            Kodarai. You are granted a limited, non-exclusive, non-transferable licence to use the
            Service for your personal or internal business purposes. You retain ownership of any content
            you upload or generate through the Service.
          </p>

          <h2>6. AI-Generated Content</h2>
          <p>
            The Service uses artificial intelligence to generate website prompts and cold-call scripts.
            This content is provided for informational purposes only. Kodarai makes no guarantee as to
            its accuracy, completeness, or fitness for any particular purpose. You are solely responsible
            for reviewing, editing, and using any AI-generated content.
          </p>

          <h2>7. Data & Third-Party Sources</h2>
          <p>
            Business listings and associated data (ratings, phone numbers, addresses) are sourced from
            publicly available third-party APIs. We do not guarantee the accuracy or completeness of
            this data. You agree to use such data in compliance with all applicable laws, including
            those governing cold calling and marketing communications in your jurisdiction.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Kodarai and its officers, employees, and affiliates
            shall not be liable for any indirect, incidental, special, consequential, or punitive damages
            arising out of or related to your use of the Service, even if we have been advised of the
            possibility of such damages. Our total liability shall not exceed the amount you paid to us
            in the 12 months preceding the claim.
          </p>

          <h2>9. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind, express
            or implied, including merchantability, fitness for a particular purpose, or non-infringement.
            We do not warrant that the Service will be uninterrupted, error-free, or free of viruses.
          </p>

          <h2>10. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violation of these
            Terms or for any other reason at our sole discretion. Upon termination, your right to use the
            Service will immediately cease.
          </p>

          <h2>11. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes by
            posting the new Terms on this page and updating the "Last updated" date. Continued use of
            the Service after changes constitutes acceptance of the new Terms.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Federal
            Republic of Nigeria, without regard to its conflict-of-law principles.
          </p>

          <h2>13. Contact</h2>
          <p>
            If you have any questions about these Terms, please{" "}
            <Link to="/contact" className="text-primary underline underline-offset-4">contact us</Link>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
