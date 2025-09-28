import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
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
  // We use a single "inSection" boolean to detect when user has scrolled into the "Últimas leyes" section.
  // Default UX: use the 'collapsed width' as the normal width. When entering the section, shrink the header
  // to approximately 50% width. Collapse should NOT be triggered by general scroll-down behavior.
  const [inUltimasSection, setInUltimasSection] = useState(false);
  const [hovering, setHovering] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkPositions = () => {
      const el = document.getElementById("ultimas-leyes");
      if (!el || !headerRef.current) return;
      const top = el.getBoundingClientRect().top;
      const headerH = headerRef.current.getBoundingClientRect().height;
      // enter section when the top of the UltimasLeyes section is within header height + small offset
      setInUltimasSection(top <= headerH + 12);
    };

    // initial check in case landing directly on the section
    checkPositions();
    window.addEventListener("scroll", checkPositions, { passive: true });
    window.addEventListener("resize", checkPositions);
    return () => {
      window.removeEventListener("scroll", checkPositions);
      window.removeEventListener("resize", checkPositions);
    };
  }, []);

  // collapsed state (narrowest) applies only when inside the UltimasLeyes section
  const collapsed = inUltimasSection;
  // show expanded visuals when hovering, otherwise follow collapsed logic
  const expanded = hovering && !inUltimasSection;

  return (
    <div
      className={cn(
        // keep sticky but float slightly from top and avoid any backdrop or full-width background
        "sticky top-4 z-40 w-full transition-all duration-300",
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className={cn("container transition-all duration-300", expanded ? "py-3" : "py-2") }>
        {/* Boxed, rounded header that floats inside the container. Use full width inside the container so edges align with content. */}
        <div
          ref={headerRef}
          // Default: occupy the container width so edges align with the cards below.
          // When inUltimasSection -> shrink to ~50% width centered.
          className={cn(
            "w-full transition-all duration-300 overflow-hidden rounded-2xl border bg-card flex items-center justify-between pointer-events-auto",
            inUltimasSection
              ? "w-1/2 mx-auto py-2 px-3 transform scale-95 shadow-[0_4px_8px_rgba(0,0,0,0.02)] rounded-[40px]"
              : "w-full mx-auto py-3 px-5 transform scale-100 shadow-[0_4px_8px_rgba(0,0,0,0.02)] rounded-2xl"
          )}
        >
          <div className="flex items-center gap-6">
            <BrandTitle compact={inUltimasSection} />
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground font-semibold">
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

function BrandTitle({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <a href="/" aria-label="Leybertad" className="select-none">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">L</div>
        </div>
      </a>
    );
  }

  return (
    <a href="/" className="select-none">
      <div className="flex items-end gap-2">
        <h1 className="font-brand text-2xl md:text-3xl tracking-wide text-primary font-semibold">Leybertad</h1>
        <span className="text-xs mb-1 text-muted-foreground">®</span>
      </div>
    </a>
  );
}
