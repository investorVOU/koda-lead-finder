import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2 } from "lucide-react";
import { getPublicClientPackProposal } from "@/lib/client-pack.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/proposal/$shareToken")({ component: PublicProposal });

const labels: Record<string, string> = {
  mobile_friendly: "Professional mobile-friendly website",
  contact_button: "Contact button",
  location_map: "Business location / map",
};
function PublicProposal() {
  const { shareToken } = Route.useParams();
  const load = useServerFn(getPublicClientPackProposal);
  const query = useQuery({
    queryKey: ["public-proposal", shareToken],
    queryFn: () => load({ data: { token: shareToken } }),
  });
  const proposal = query.data && "proposal" in query.data ? query.data.proposal : null;
  if (query.isLoading)
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </main>
    );
  if (!proposal)
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
        <div>
          <h1 className="text-xl font-semibold">Proposal not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This proposal link may have been removed or is no longer active.
          </p>
        </div>
      </main>
    );
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-background p-4 sm:p-8">
      <article className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Website Proposal
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Prepared for: {proposal.businessName}</h1>
        {proposal.category && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[proposal.category, proposal.location].filter(Boolean).join("  ")}
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Prepared by: {proposal.preparedBy || "Website designer"}
        </p>
        <h2 className="mt-7 font-semibold">What I'll build</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {proposal.includedItems.length ? (
            proposal.includedItems.map((item) => <li key={item}>{labels[item] ?? item}</li>)
          ) : (
            <li>Website details to be agreed</li>
          )}
        </ul>
        {proposal.demoToken && (
          <Button className="mt-5" asChild>
            <a href={`/demo/${proposal.demoToken}`} target="_blank" rel="noreferrer">
              View Website Demo <ExternalLink className="size-4" />
            </a>
          </Button>
        )}
        <h2 className="mt-7 font-semibold">Price</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {[proposal.currency, proposal.price].filter(Boolean).join(" ") || "To be agreed"}
        </p>
        <h2 className="mt-5 font-semibold">Delivery</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {proposal.deliveryDays ? `${proposal.deliveryDays} days` : "To be agreed"}
        </p>
        <h2 className="mt-7 font-semibold">Next step</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          If you are happy with the sample, we can agree the final details and I can complete the
          website for you.
        </p>
        {proposal.note && (
          <p className="mt-5 text-sm leading-6 text-muted-foreground">{proposal.note}</p>
        )}
      </article>
    </main>
  );
}
