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
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const lastScroll = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScroll.current && y > 40) setCollapsed(true);
      if (y < 10) setCollapsed(false);
      lastScroll.current = y;
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <div className="container">
        <div className={cn("transition-all duration-300 overflow-hidden", expanded ? "h-28" : "h-14")}> 
          <div className="flex h-14 items-center justify-between">
            <BrandTitle />
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#recientes" className="hover:text-foreground">Últimas leyes</a>
              <a href="#guardados" className="hover:text-foreground">Tus guardados</a>
              <a href="#contacto" className="hover:text-foreground">Contacto</a>
            </nav>
            <button aria-label="Menú" className="md:hidden p-2 rounded-md border text-sm">≡</button>
          </div>
          <div className={cn("px-1", expanded ? "opacity-100" : "opacity-0")}> 
            <div className="relative mx-auto max-w-xl">
              <div className="h-8 rounded-full border bg-white/70 flex items-center justify-center text-xs text-muted-foreground">
                La voluntad del pueblo en una sola plataforma
              </div>
            </div>
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
