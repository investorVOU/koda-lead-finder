import { Logo } from "@/components/landing/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The lead generation tool for web designers. Find businesses without websites and close
              them fast.
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#reviews" className="hover:text-foreground">Reviews</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} KodaRai · kodarai.xyz — All rights reserved.
        </div>
      </div>
    </footer>
  );
}
