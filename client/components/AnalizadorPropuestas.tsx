import { useState } from "react";
import { analyzeProposal, AnalyzerMatch } from "@/lib/spanishLaws";
import { cn } from "@/lib/utils";

export default function AnalizadorPropuestas() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalyzerMatch[] | null>(null);

  async function onAnalyze() {
    const q = text.trim();
    setResults(null);
    if (!q) return;
    setIsLoading(true);
    // Simulate async analysis latency for UX feedback
    await new Promise((r) => setTimeout(r, 450));
    const r = analyzeProposal(q, 8);
    setResults(r);
    setIsLoading(false);
  }

  const hasResults = results && results.length > 0;

  return (
    <div className="rounded-2xl border bg-[#0b1220]/80 backdrop-blur p-4 md:p-5 text-white">
      <div className="mb-2">
        <h4 className="font-playfair text-xl md:text-2xl leading-tight">Analizador de Propuestas</h4>
        <p className="text-sm text-gray-300 mt-1">Introduce el título o la idea principal de tu propuesta para encontrar leyes vigentes relacionadas.</p>
      </div>

      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej: 'Modificar el IVA de los productos culturales al 4%'..."
          className="w-full min-h-[80px] rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <div className="mt-2 flex items-center justify-end">
          <button
            onClick={onAnalyze}
            disabled={!text.trim() || isLoading}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs disabled:opacity-50",
            )}
          >
            {isLoading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/70 border-t-transparent" aria-hidden />
            )}
            <span>{isLoading ? "Analizando…" : "Analizar Concordancia"}</span>
          </button>
        </div>
      </div>

      {results !== null && (
        <div className="mt-4">
          {!hasResults && (
            <div className="text-center text-sm text-gray-300 py-6">
              No se han encontrado leyes directamente relacionadas. Tu propuesta podría ser verdaderamente novedosa.
            </div>
          )}

          {hasResults && (
            <div>
              <h5 className="text-lg font-semibold mb-3">Leyes Relacionadas Sugeridas</h5>
              <ul className="space-y-3">
                {results!.map((r) => (
                  <li key={r.law.id} className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-4">
                      <Relevance value={Math.round(r.score * 100)} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h6 className="font-medium text-[0.95rem] text-white truncate">{r.law.title}</h6>
                            <p className="mt-1 italic text-sm text-gray-300">{r.law.summary}</p>
                          </div>
                          <a
                            href={r.law.url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-2 whitespace-nowrap text-sm text-cream-200 hover:text-cream-100 underline-offset-4 hover:underline"
                          >
                            Consultar en la Biblioteca →
                          </a>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Relevance({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const gradient = `conic-gradient(#d4b46a ${clamped * 3.6}deg, rgba(255,255,255,0.1) 0)`; // goldish accent
  return (
    <div className="flex-shrink-0">
      <div className="relative h-12 w-12 rounded-full" style={{ background: gradient }} aria-label={`${clamped}% Relevante`}>
        <div className="absolute inset-[3px] rounded-full bg-[#0b1220] grid place-items-center text-xs text-white/90">
          {clamped}%
        </div>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-300 text-center">Relevante</div>
    </div>
  );
}
