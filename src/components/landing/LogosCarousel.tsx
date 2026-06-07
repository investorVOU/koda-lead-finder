const LOGOS = [
  { name: "Forge Digital",      cls: "font-bold tracking-tight" },
  { name: "PixelWave",          cls: "font-black italic" },
  { name: "LaunchPad",          cls: "font-semibold uppercase tracking-widest text-xs" },
  { name: "Northstar Studio",   cls: "font-medium" },
  { name: "Baseline Creative",  cls: "font-bold" },
  { name: "Meridian Web",       cls: "font-semibold tracking-tight" },
  { name: "Apex Digital",       cls: "font-black" },
  { name: "Rootvine Design",    cls: "font-medium italic" },
  { name: "CloudBase",          cls: "font-bold tracking-wide" },
  { name: "Summit Agency",      cls: "font-semibold" },
  { name: "Vantage Studio",     cls: "font-medium tracking-tight" },
  { name: "Nimbus Creative",    cls: "font-bold" },
];

// Duplicate for seamless infinite loop
const DOUBLED = [...LOGOS, ...LOGOS];

export function LogosCarousel() {
  return (
    <div className="border-b border-border bg-background py-10 sm:py-12">
      <p className="mb-7 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
        Trusted by fast-growing companies worldwide
      </p>

      <div className="relative overflow-hidden">
        {/* Fade-out edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent sm:w-32" />

        <div className="animate-marquee flex w-max items-center gap-12 sm:gap-16">
          {DOUBLED.map((logo, i) => (
            <span
              key={i}
              aria-hidden={i >= LOGOS.length}
              className={`whitespace-nowrap text-[15px] leading-none text-foreground/20 transition-colors duration-300 hover:text-foreground/50 ${logo.cls}`}
            >
              {logo.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
