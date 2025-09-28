import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CollapsibleHeader />
      <main className="container pt-6 pb-16">{children}</main>
      <footer className="container py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Leybertad — plataforma social para expresar y mejorar leyes.
      </footer>
    </div>
  );
}

function CollapsibleHeader() {
  const [collapsedByScroll, setCollapsedByScroll] = useState(false);
  const [collapsedBySection, setCollapsedBySection] = useState(false);
  const [hovering, setHovering] = useState(false);
  const lastScroll = useRef(0);
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkPositions = () => {
      const el = document.getElementById("ultimas-leyes");
      if (!el || !headerRef.current) return;
      const top = el.getBoundingClientRect().top;
      const headerH = headerRef.current.getBoundingClientRect().height;
      // collapse when the top of the UltimasLeyes section reaches the header height (i.e. we've scrolled into it)
      setCollapsedBySection(top <= headerH + 12);
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScroll.current && y > 40) setCollapsedByScroll(true);
      if (y < 10) setCollapsedByScroll(false);
      lastScroll.current = y;
      checkPositions();
    };

    // initial check in case landing directly on the section
    checkPositions();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", checkPositions);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", checkPositions);
    };
  }, []);

  const collapsed = collapsedByScroll || collapsedBySection;
  const expanded = hovering || !collapsed;

  return (
    <div
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300 backdrop-blur",
        collapsed ? "shadow-sm bg-white/70" : "bg-transparent",
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="container py-3">
        {/* Boxed, rounded header that subtly scales/pads when collapsed */}
        <div
          ref={headerRef}
          className={cn(
            "mx-auto max-w-6xl transition-all duration-300 overflow-hidden rounded-2xl border bg-card flex items-center justify-between",
            expanded ? "py-4 px-5 scale-100" : "py-2 px-3 scale-95"
          )}
        >
          <div className="flex items-center gap-6">
            <BrandTitle />
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="#ultimas-leyes"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("ultimas-leyes");
                  if (el) {
                    el.classList.remove("slide-temp");
                    void (el as any).offsetHeight;
                    el.classList.add("slide-temp");
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    setTimeout(() => el.classList.remove("slide-temp"), 700);
                  }
                  try { window.history.replaceState(null, "", "#ultimas-leyes"); } catch (err) {}
                }}
                className="hover:text-foreground"
              >
                Últimas leyes
              </a>
              <a href="#guardados" className="hover:text-foreground">Tus guardados</a>
              <a href="#contacto" className="hover:text-foreground">Contacto</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button aria-label="Buscar" className="hidden md:inline-flex p-2 rounded-full border bg-white/80">🔍</button>
            <button aria-label="Menú" className="md:hidden p-2 rounded-md border text-sm">≡</button>
            <button className="ml-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm">Try Demo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandTitle() {
  return (
    <a href="/" className="select-none">
      <div className="flex items-end gap-2">
        <h1 className="font-brand text-2xl md:text-3xl tracking-wide text-primary">Leybertad</h1>
        <span className="text-xs mb-1 text-muted-foreground">®</span>
      </div>
    </a>
  );
}
