import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { analyzeProposal, AnalyzerMatch } from "@/lib/spanishLaws";

export default function AnalizadorPropuestas({ externalQuery, externalTrigger }: { externalQuery?: string; externalTrigger?: number }) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalyzerMatch[] | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const [showFilter, setShowFilter] = useState(false);
  const [timeframe, setTimeframe] = useState<'any'|'week'|'month'|'year'>('any');
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  async function analyzeQuery(q: string) {
    const query = String(q || "").trim();
    setResults(null);
    if (!query) return;
    setIsLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 250));
      const sinceParam = timeframe === 'week' ? '&since_days=7' : timeframe === 'month' ? '&since_days=30' : timeframe === 'year' ? '&since_days=365' : '';
      const res = await fetch(`/api/boe/search?q=${encodeURIComponent(query)}&limit=8${sinceParam}`);
      if (!res.ok) throw new Error("api_error");
      const json = await res.json();
      if (json && Array.isArray(json.results)) {
        const mapped: AnalyzerMatch[] = json.results.map((r: any) => ({
          law: {
            id: r.id || r.title,
            title: r.title || "Sin título",
            summary: r.summary || "",
            url: r.pdf_url || r.boe_url || r.url || "#",
            keywords: [],
          },
          score: typeof r.score === "number" ? r.score : 1,
          matched: Array.isArray(r.matched_terms) ? r.matched_terms : [query],
        }));
        if (!mounted.current) return;
        setResults(mapped);
        setIsLoading(false);
        return;
      }
      throw new Error("no_results");
    } catch (err) {
      const fallback = analyzeProposal(query, 8);
      if (!mounted.current) return;
      setResults(fallback);
      setIsLoading(false);
    }
  }

  // expose external trigger via window event
  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<Record<string, unknown>>;
      const q = ce?.detail && (ce.detail as any).q;
      if (q && typeof q === "string") {
        setText(q);
        analyzeQuery(q);
      }
    }
    window.addEventListener('analyzer:trigger', handler as EventListener);
    return () => window.removeEventListener('analyzer:trigger', handler as EventListener);
  }, []);

  // compute menu position when opened
  useEffect(() => {
    if (showFilter) {
      const rect = anchorRef.current?.getBoundingClientRect() || null;
      setMenuRect(rect);
    }
  }, [showFilter]);

  // click outside to close
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!showFilter) return;
      if (menuRef.current && (menuRef.current === target || menuRef.current.contains(target))) return;
      if (anchorRef.current && (anchorRef.current === target || anchorRef.current.contains(target))) return;
      setShowFilter(false);
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [showFilter]);

  // also support direct prop trigger
  useEffect(() => {
    if (externalTrigger && externalQuery) {
      setText(externalQuery);
      analyzeQuery(externalQuery);
    }
  }, [externalTrigger]);

  const hasResults = results && results.length > 0;

  return (
    <div className={`rounded-2xl border bg-[#0b1220]/80 backdrop-blur p-4 md:p-5 text-white flex flex-col min-h-0 overflow-hidden ${results === null ? 'max-h-[24vh]' : 'max-h-[36vh]'}`}>
      {/* header/hint area: show only before any search; animate collapse */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${results === null ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-center justify-center h-24">
          <div className="text-center">
            <h4 className="font-playfair text-xl md:text-2xl leading-tight">Analizador de Propuestas</h4>
            <p className="text-sm text-gray-300 mt-2">Usa la barra superior derecha para analizar la concordancia; los resultados aparecerán aquí.</p>
          </div>
        </div>
      </div>

      {/* results area */}
      <div className="mt-0 transition-opacity duration-200 flex flex-col min-h-0" style={{ opacity: results === null ? 0 : 1 }}>
        {results !== null && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-lg font-semibold">Leyes Relacionadas Sugeridas</h5>
                <div className="flex items-center gap-2">
                  <button
                    ref={anchorRef}
                    onClick={() => setShowFilter((s) => !s)}
                    className="text-sm px-3 py-1 rounded-md border bg-white/5 hover:bg-white/10 flex items-center gap-2"
                    aria-expanded={showFilter}
                    aria-label="Filtrar por tiempo"
                  >
                    Filtrar por tiempo
                  </button>

                  {showFilter && menuRect && ReactDOM.createPortal(
                    <div
                      ref={menuRef}
                      style={{
                        position: 'fixed',
                        top: Math.min(menuRect.top + menuRect.height + 8, window.innerHeight - 48),
                        left: Math.max(8, Math.min(menuRect.right - 176, window.innerWidth - 184)),
                        width: 176,
                      }}
                      className="rounded-md shadow-lg bg-gray-800 border border-white/10 text-white z-50"
                    >
                      <button className={`w-full text-left px-3 py-2 ${timeframe === 'any' ? 'bg-gray-700' : ''}`} onClick={() => { setTimeframe('any'); if (text) analyzeQuery(text); setShowFilter(false); }}>Cualquiera</button>
                      <button className={`w-full text-left px-3 py-2 ${timeframe === 'week' ? 'bg-gray-700' : ''}`} onClick={() => { setTimeframe('week'); if (text) analyzeQuery(text); setShowFilter(false); }}>Última semana</button>
                      <button className={`w-full text-left px-3 py-2 ${timeframe === 'month' ? 'bg-gray-700' : ''}`} onClick={() => { setTimeframe('month'); if (text) analyzeQuery(text); setShowFilter(false); }}>Último mes</button>
                      <button className={`w-full text-left px-3 py-2 ${timeframe === 'year' ? 'bg-gray-700' : ''}`} onClick={() => { setTimeframe('year'); if (text) analyzeQuery(text); setShowFilter(false); }}>Último año</button>
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {!hasResults && (
                <div className="text-center text-sm text-gray-300 py-6">
                  No se han encontrado leyes directamente relacionadas. Tu propuesta podría ser verdaderamente novedosa.
                </div>
              )}

              {hasResults && (
                <ul className="space-y-2 p-1">
                  {results!.map((r) => (
                    <li key={r.law.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                      <div className="flex items-center gap-3">
                        <Relevance value={Math.round(r.score * 100)} small className="self-center" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex flex-col justify-center space-y-1">
                              <h6 className="font-medium text-sm text-white truncate">{r.law.title}</h6>
                              <p className="italic text-xs text-gray-300 line-clamp-2">{r.law.summary}</p>
                            </div>
                            <a
                              href={r.law.url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 whitespace-nowrap text-sm text-cream-200 hover:text-cream-100 underline-offset-4 hover:underline h-8 flex items-center"
                            >
                              Consultar →
                            </a>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Relevance({ value, small }: { value: number; small?: boolean }) {
  const clamped = Math.max(0, Math.min(100, value));
  const size = small ? 32 : 44;
  const font = small ? 'text-[9px]' : 'text-xs';
  const gradient = `conic-gradient(#d4b46a ${clamped * 3.6}deg, rgba(255,255,255,0.1) 0)`; // goldish accent
  return (
    <div className="flex-shrink-0">
      <div className={`relative rounded-full`} style={{ background: gradient, height: size, width: size }} aria-label={`${clamped}%`}>
        <div className={`absolute inset-[3px] rounded-full bg-[#0b1220] grid place-items-center ${font} text-white/90`}>
          {clamped}%
        </div>
      </div>
    </div>
  );
}
