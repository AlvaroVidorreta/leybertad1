import React, { useEffect, useRef, useState } from "react";

type Category = { title: string; subs: string[] };

export default function HorizontalCarousel({
  categories,
  warmPalettes,
  onSelectSub,
}: {
  categories: Category[];
  warmPalettes: string[];
  onSelectSub: (category: string, sub: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // px per second: medium-slow
  const SPEED = 36;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    lastTimeRef.current = performance.now();

    function step(now: number) {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (!isPaused) {
        const halfWidth = track.scrollWidth / 2;
        posRef.current -= SPEED * dt;
        if (Math.abs(posRef.current) >= halfWidth) {
          posRef.current += halfWidth;
        }
        track.style.transform = `translateX(${posRef.current}px)`;
      }

      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPaused]);

  function handleMouseEnter() {
    setIsPaused(true);
    setIsHovered(true);
  }
  function handleMouseLeave() {
    setIsPaused(false);
    setIsHovered(false);
  }

  function scrollByPx(px: number) {
    const track = trackRef.current;
    if (!track) return;
    setIsPaused(true);
    posRef.current -= px;
    const half = track.scrollWidth / 2;
    if (Math.abs(posRef.current) >= half) posRef.current += half;
    track.style.transition = "transform 320ms ease";
    track.style.transform = `translateX(${posRef.current}px)`;
    setTimeout(() => {
      if (track) track.style.transition = "";
      setIsPaused(false);
    }, 340);
  }

  return (
    // make the carousel full-bleed relative to the parent panel (parent has p-6)
    <div className="relative -mx-6" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="overflow-hidden">
        <div ref={containerRef} className="w-full px-6">
          <div ref={trackRef} className="flex" style={{ transform: "translateX(0px)" }}>
            {categories.concat(categories).map((c, idx) => {
              const i = idx % categories.length;
              const bg = warmPalettes[i % warmPalettes.length];
              return (
                <div key={idx} className="flex-shrink-0 w-[25%] p-3">
                  <div
                    role="button"
                    aria-label={`Ver subtemas de ${c.title}`}
                    className={`relative rounded-md border overflow-hidden aspect-square flex items-center justify-center text-center p-3 cursor-pointer group ${bg}`}
                  >
                    <div className="z-10 transition-opacity duration-300 ease-in-out group-hover:opacity-0">
                      <span className="text-sm md:text-base font-semibold tracking-widest text-foreground">{c.title}</span>
                    </div>

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 ease-in-out flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out w-full px-4">
                        <div className="flex flex-col items-stretch gap-2">
                          {c.subs.map((s) => (
                            <div
                              key={s}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSub(c.title, s);
                              }}
                              className="bg-cream-100 text-foreground text-sm rounded-full px-3 py-1 shadow-sm transform transition-transform duration-300 ease-in-out hover:-translate-y-0.5 hover:scale-[1.004] cursor-pointer"
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        aria-label="previous"
        onClick={() => {
          const container = containerRef.current;
          if (!container) return;
          scrollByPx(-container.clientWidth / 4);
        }}
        className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-card/80 p-2 ${isHovered ? "opacity-100" : "opacity-0"} transition-opacity shadow-md`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-foreground">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        aria-label="next"
        onClick={() => {
          const container = containerRef.current;
          if (!container) return;
          scrollByPx(container.clientWidth / 4);
        }}
        className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-card/80 p-2 ${isHovered ? "opacity-100" : "opacity-0"} transition-opacity shadow-md`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-foreground">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
