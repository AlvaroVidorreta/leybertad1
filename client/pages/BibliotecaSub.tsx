import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { obtenerRecientes } from "@/lib/api";
import LawSummary from "@/components/LawSummary";

type Law = {
  id: string;
  titulo: string;
  objetivo?: string;
  detalles?: string;
  createdAt?: string;
  upvotes?: number;
};

export default function BibliotecaSub({ categoryProp, subProp, onClose, onOpenLaw }: { categoryProp?: string; subProp?: string; onClose?: () => void; onOpenLaw?: (law: Law, openComments?: boolean) => void; }) {
  const params = useParams();
  const navigate = useNavigate();
  const { data: laws = [], isLoading } = useQuery<Law[]>({ queryKey: ["recientes"], queryFn: obtenerRecientes, staleTime: 10000, refetchOnWindowFocus: false });

  const category = categoryProp ?? params.category;
  const sub = subProp ?? params.sub;

  const subLabel = decodeURIComponent(sub || "");
  const categoryLabel = decodeURIComponent(category || "");

  const matched = useMemo(() => {
    const items = laws ?? [];
    const term = (subLabel || categoryLabel).toLowerCase();
    const filtered = term
      ? items.filter((l) => {
          const hay = [l.titulo, l.objetivo, (l as any).detalles].filter(Boolean).join(" ").toLowerCase();
          return hay.includes(term);
        })
      : items;
    // sort by newest first
    return filtered.slice().sort((a, b) => {
      const aDate = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bDate = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bDate - aDate;
    });
  }, [laws, subLabel, categoryLabel]);

  const ranking = useMemo(() => {
    return [...matched].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 5);
  }, [matched]);

  return (
    <div className="relative rounded-2xl border p-6 md:p-8 mt-6 bg-card">
      <button
        onClick={() => (onClose ? onClose() : navigate(-1))}
        aria-label="Cerrar"
        className="absolute -left-3 -top-3 p-2 rounded-full border bg-white/80 text-sm w-8 h-8 flex items-center justify-center shadow"
      >
        ×
      </button>

      <div className="mb-4">
        <h3 className="text-2xl md:text-3xl font-semibold">{subLabel || categoryLabel}</h3>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 border rounded-md bg-background p-4 flex flex-col min-h-0">
          <h4 className="font-medium mb-3">Leyes relacionadas ({matched.length})</h4>

          <div className="mt-2 min-h-0 flex-1 overflow-auto">
            {isLoading && <div className="text-sm text-muted-foreground">Cargando…</div>}

            {!isLoading && matched.length === 0 && (
              <div className="text-sm text-muted-foreground">No se encontraron leyes para este subapartado.</div>
            )}

            {!isLoading && matched.length > 0 && (
              <ul className="space-y-3">
                {matched.map((l) => (
                  <li key={l.id} onClick={() => onOpenLaw ? onOpenLaw(l) : undefined} className="rounded-lg border p-3 bg-card cursor-pointer">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <LawSummary title={l.titulo} objetivo={l.objetivo} />
                      </div>

                      <div className="flex-shrink-0 flex flex-col items-center gap-2">
                        <div className="rounded-full border px-3 py-0.5 text-sm bg-white">▲ {l.upvotes}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="md:col-span-1 border rounded-md bg-background p-4">
          <h4 className="font-medium mb-3">Top 5</h4>
          {isLoading && <div className="text-sm text-muted-foreground">Cargando…</div>}

          {!isLoading && ranking.length === 0 && (
            <div className="text-sm text-muted-foreground">No hay resultados</div>
          )}

          {!isLoading && ranking.length > 0 && (
            <ol className="space-y-2">
              {ranking.map((r, idx) => (
                <li key={r.id} className="flex items-center gap-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream-200 text-sm font-semibold">{idx + 1}</div>
                  <div className="flex-1">
                    <div className="font-medium text-sm truncate">{r.titulo}</div>
                    <div className="text-xs text-muted-foreground">▲ {r.upvotes}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}
