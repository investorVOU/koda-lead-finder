import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/landing/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:gap-10">
          {/* Brand */}
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The lead generation tool for web designers. Find businesses without websites and close
              them fast.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 sm:gap-x-12">
            {/* Product */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Product
              </p>
              <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="/#features" className="hover:text-foreground transition-colors">Features</a>
                <a href="/#pricing" className="hover:text-foreground transition-colors">Pricing</a>
                <a href="/#reviews" className="hover:text-foreground transition-colors">Reviews</a>
                <Link to="/learn" className="hover:text-foreground transition-colors">Academy</Link>
              </nav>
            </div>

            {/* Company */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Company
              </p>
              <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
                <a href="mailto:hello@kodarai.xyz" className="break-all hover:text-foreground transition-colors">hello@kodarai.xyz</a>
              </nav>
            </div>

            {/* Legal */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Legal
              </p>
              <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              </nav>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-center text-xs text-muted-foreground sm:mt-10 sm:flex-row sm:text-left">
          <span>© {new Date().getFullYear()} Kodarai · kodarai.xyz — All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
