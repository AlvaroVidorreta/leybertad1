import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CollapsibleHeader />
      <main className="container pt-8 md:pt-12 lg:pt-20 pb-16">{children}</main>
      <footer className="container py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Leybertad — plataforma social para
        expresar y mejorar leyes.
      </footer>
    </div>
  );
}

function CollapsibleHeader() {
  // Shrink header when user scrolls into the "Últimas leyes" section.
  const [inUltimasSection, setInUltimasSection] = useState(false);
  const [hovering, setHovering] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);

  // account dropdown state
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!accountRef.current) return;
      if (e.target instanceof Node && !accountRef.current.contains(e.target))
        setAccountOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => {
      document.removeEventListener("click", onDocClick);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const elGetter = () => document.getElementById("ultimas-leyes");
    let ticking = false;
    const checkPositions = () => {
      const el = elGetter();
      if (!el || !headerRef.current) return;
      const top = el.getBoundingClientRect().top;
      const headerH = headerRef.current.getBoundingClientRect().height;
      setInUltimasSection(top <= headerH + 12);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        checkPositions();
        ticking = false;
      });
    };

    // initial check in case landing directly on the section
    checkPositions();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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
      <div
        className={cn(
          "container transition-all duration-300",
          expanded ? "py-3" : "py-2",
        )}
      >
        {/* Boxed, rounded header that floats inside the container. Use full width inside the container so edges align with content. */}
        <div
          ref={headerRef}
          className={cn(
            "w-full transition-all duration-300 overflow-visible rounded-2xl border bg-card pointer-events-auto",
            inUltimasSection
              ? "w-1/2 mx-auto py-2 px-3 transform scale-95 shadow-[0_4px_8px_rgba(0,0,0,0.02)] rounded-[40px]"
              : "w-full mx-auto py-3 px-5 transform scale-100 shadow-[0_4px_8px_rgba(0,0,0,0.02)] rounded-2xl",
          )}
        >
          {/* Use a 3-column grid so the nav remains centered both normally and when header shrinks. */}
          <div className="w-full grid grid-cols-3 items-center gap-4">
            <div className="flex items-center col-start-1">
              <BrandTitle compact={inUltimasSection} />
            </div>

            <div className="flex justify-center col-start-2">
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
                    try {
                      window.history.replaceState(null, "", "#ultimas-leyes");
                    } catch (err) {}
                  }}
                  className="hover:text-foreground"
                >
                  Bibliotecas
                </a>
                <a href="#contacto" className="hover:text-foreground">
                  Contacto
                </a>
              </nav>
            </div>

            <div className="flex items-center justify-end col-start-3 gap-3">
              {!inUltimasSection && (
                <button
                  aria-label="Iniciar sesión"
                  className="hidden md:inline-flex text-xs px-3 py-2 rounded-full border bg-white/80 btn-micro-raise"
                >
                  Iniciar sesión
                </button>
              )}

              <button
                aria-label="Menú"
                className="md:hidden p-2 rounded-md border text-sm"
              >
                ≡
              </button>

              <div
                className="relative"
                ref={accountRef}
                onMouseEnter={() => {
                  if (closeTimerRef.current) {
                    window.clearTimeout(closeTimerRef.current);
                    closeTimerRef.current = null;
                  }
                  setAccountOpen(true);
                }}
                onMouseLeave={() => {
                  closeTimerRef.current = window.setTimeout(
                    () => setAccountOpen(false),
                    250,
                  );
                }}
              >
                <button
                  onClick={() => {
                    setAccountOpen((s) => {
                      const next = !s;
                      if (next && closeTimerRef.current) {
                        window.clearTimeout(closeTimerRef.current);
                        closeTimerRef.current = null;
                      }
                      return next;
                    });
                  }}
                  aria-haspopup="true"
                  aria-expanded={accountOpen}
                  className="ml-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm btn-micro-shimmer"
                >
                  Cuenta
                </button>

                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-44 rounded-md border bg-card p-2 shadow-lg z-50 transform transition-all duration-200 ease-out origin-top-right"
                    onMouseEnter={() => {
                      if (closeTimerRef.current) {
                        window.clearTimeout(closeTimerRef.current);
                        closeTimerRef.current = null;
                      }
                    }}
                    onMouseLeave={() => {
                      if (closeTimerRef.current)
                        window.clearTimeout(closeTimerRef.current);
                      closeTimerRef.current = window.setTimeout(
                        () => setAccountOpen(false),
                        50,
                      );
                    }}
                  >
                    <a
                      href="#guardados"
                      onClick={() => setAccountOpen(false)}
                      className="block px-3 py-2 text-sm hover:bg-white/5 rounded-md"
                    >
                      Tus guardados
                    </a>
                    <a
                      href="/perfil"
                      onClick={() => setAccountOpen(false)}
                      className="block px-3 py-2 text-sm hover:bg-white/5 rounded-md"
                    >
                      Perfil
                    </a>
                    <button
                      onClick={() => setAccountOpen(false)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 rounded-md"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
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
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-brand font-semibold">
            L
          </div>
        </div>
      </a>
    );
  }

  return (
    <a href="/" className="select-none">
      <div className="flex items-end gap-2">
        <h1 className="font-brand text-2xl md:text-3xl tracking-wide text-primary font-semibold">
          Leybertad
        </h1>
        <span className="text-xs mb-1 text-muted-foreground">®</span>
      </div>
    </a>
  );
}
