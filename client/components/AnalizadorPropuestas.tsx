import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { analyzeProposal, AnalyzerMatch } from "@/lib/spanishLaws";

export default function AnalizadorPropuestas({
  externalQuery,
  externalTrigger,
}: {
  externalQuery?: string;
  externalTrigger?: number;
}) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalyzerMatch[] | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [showFilter, setShowFilter] = useState(false);
  const [timeframe, setTimeframe] = useState<"any" | "week" | "month" | "year">(
    "any",
  );
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  const cacheRef = useRef<Map<string, AnalyzerMatch[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  async function analyzeQuery(
    q: string,
    tf?: "any" | "week" | "month" | "year",
  ) {
    const query = String(q || "").trim();
    if (!query) return;

    const timeframeToUse = tf || timeframe;
    const key = `${query}|${timeframeToUse}`;

    const cached = cacheRef.current.get(key);
    if (cached) {
      setResults(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      abortRef.current?.abort();
    } catch (e) {
      /* ignore */
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await new Promise((r) => setTimeout(r, 180));

      const sinceParam =
        timeframeToUse === "week"
          ? "&since_days=7"
          : timeframeToUse === "month"
            ? "&since_days=30"
            : timeframeToUse === "year"
              ? "&since_days=365"
              : "";
      const url = `/api/boe/search?q=${encodeURIComponent(query)}&limit=8${sinceParam}`;
      const res = await fetch(url, { signal: controller.signal });

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
        cacheRef.current.set(key, mapped);
        setResults(mapped);
        setIsLoading(false);
        abortRef.current = null;
        return;
      }

      throw new Error("no_results");
    } catch (err: any) {
      if (err && err.name === "AbortError") return;

      const fallback = analyzeProposal(query, 8);
      if (!mounted.current) return;
      cacheRef.current.set(key, fallback);
      setResults(fallback);
      setIsLoading(false);
      abortRef.current = null;
    }
  }

  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<Record<string, unknown>>;
      const q = ce?.detail && (ce.detail as any).q;
      if (q && typeof q === "string") {
        setText(q);
        analyzeQuery(q);
      }
    }
    window.addEventListener("analyzer:trigger", handler as EventListener);
    return () =>
      window.removeEventListener("analyzer:trigger", handler as EventListener);
  }, []);

  useEffect(() => {
    if (showFilter) {
      const rect = anchorRef.current?.getBoundingClientRect() || null;
      setMenuRect(rect);
    }
  }, [showFilter]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!showFilter) return;
      if (
        menuRef.current &&
        (menuRef.current === target || menuRef.current.contains(target))
      )
        return;
      if (
        anchorRef.current &&
        (anchorRef.current === target || anchorRef.current.contains(target))
      )
        return;
      setShowFilter(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [showFilter]);

  useEffect(() => {
    if (externalTrigger && externalQuery) {
      setText(externalQuery);
      analyzeQuery(externalQuery);
    }
  }, [externalTrigger]);

  const hasResults = results && results.length > 0;

  return (
    <div
      className={`rounded-2xl border border-amber-700 bg-amber-900/60 backdrop-blur p-4 md:p-5 text-white flex flex-col min-h-0 overflow-hidden ${results === null ? "max-h-[24vh]" : "max-h-[36vh]"}`}
    >
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${results === null ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="flex items-center justify-center h-24">
          <div className="text-center">
            <h4 className="font-playfair text-xl md:text-2xl leading-tight">
              Analizador de Propuestas
            </h4>
            <p className="text-sm text-amber-200 mt-2">
              Usa la barra superior derecha para analizar la concordancia; los
              resultados aparecerán aquí.
            </p>
          </div>
        </div>
      </div>

      <div
        className="mt-0 transition-opacity duration-200 flex flex-col min-h-0"
        style={{ opacity: results === null ? 0 : 1 }}
      >
        {results !== null && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-lg font-semibold">
                  Leyes Relacionadas Sugeridas
                </h5>
                <div className="flex items-center gap-2">
                  <button
                    ref={anchorRef}
                    onClick={() => setShowFilter((s) => !s)}
                    className="text-sm px-3 py-1 rounded-md border border-amber-700 bg-amber-800/50 hover:bg-amber-800 flex items-center gap-2 text-amber-100"
                    aria-expanded={showFilter}
                    aria-label="Filtrar por tiempo"
                  >
                    Filtrar por tiempo
                  </button>

                  {showFilter &&
                    menuRect &&
                    ReactDOM.createPortal(
                      <div
                        ref={menuRef}
                        style={{
                          position: "fixed",
                          top: Math.min(
                            menuRect.top + menuRect.height + 8,
                            window.innerHeight - 48,
                          ),
                          left: Math.max(
                            8,
                            Math.min(
                              menuRect.right - 176,
                              window.innerWidth - 184,
                            ),
                          ),
                          width: 176,
                        }}
                        className="rounded-md shadow-lg bg-amber-800 border border-amber-700 text-white z-50"
                      >
                        <button
                          className={`w-full text-left px-3 py-2 ${timeframe === "any" ? "bg-amber-700" : ""}`}
                          onClick={() => {
                            setTimeframe("any");
                            if (text) analyzeQuery(text, "any");
                            setShowFilter(false);
                          }}
                        >
                          Cualquiera
                        </button>
                        <button
                          className={`w-full text-left px-3 py-2 ${timeframe === "week" ? "bg-amber-700" : ""}`}
                          onClick={() => {
                            setTimeframe("week");
                            if (text) analyzeQuery(text, "week");
                            setShowFilter(false);
                          }}
                        >
                          Última semana
                        </button>
                        <button
                          className={`w-full text-left px-3 py-2 ${timeframe === "month" ? "bg-amber-700" : ""}`}
                          onClick={() => {
                            setTimeframe("month");
                            if (text) analyzeQuery(text, "month");
                            setShowFilter(false);
                          }}
                        >
                          Último mes
                        </button>
                        <button
                          className={`w-full text-left px-3 py-2 ${timeframe === "year" ? "bg-amber-700" : ""}`}
                          onClick={() => {
                            setTimeframe("year");
                            if (text) analyzeQuery(text, "year");
                            setShowFilter(false);
                          }}
                        >
                          Último año
                        </button>
                      </div>,
                      document.body,
                    )}
                </div>
              </div>

              {!hasResults && (
                <div className="text-center text-sm text-amber-200 py-6">
                  No se han encontrado leyes directamente relacionadas. Tu
                  propuesta podría ser verdaderamente novedosa.
                </div>
              )}

              {hasResults && (
                <ul className="space-y-2 p-1">
                  {results!.map((r) => (
                    <li
                      key={r.law.id}
                      className="rounded-lg border border-amber-700 bg-amber-900/30 p-2"
                    >
                      <div className="flex items-center">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex flex-col justify-center space-y-1 translate-y-px">
                              <h6 className="font-medium text-sm text-amber-50 truncate">
                                {r.law.title}
                              </h6>
                              <p className="italic text-xs text-amber-200 line-clamp-2">
                                {r.law.summary}
                              </p>
                            </div>
                            <a
                              href={r.law.url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 whitespace-nowrap text-sm text-amber-300 hover:text-amber-200 underline-offset-4 hover:underline flex items-center py-2 self-center"
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
