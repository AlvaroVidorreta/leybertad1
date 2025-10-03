import { useMemo } from "react";
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { obtenerRecientes } from "@/lib/api";

export default function BibliotecaSub({ categoryProp, subProp, onClose }: { categoryProp?: string; subProp?: string; onClose?: () => void }) {
  const params = useParams();
  const navigate = useNavigate();
  const { data: laws, isLoading } = useQuery({ queryKey: ["recientes"], queryFn: obtenerRecientes, staleTime: 10000, refetchOnWindowFocus: false });

  const category = categoryProp ?? params.category;
  const sub = subProp ?? params.sub;

  const subLabel = decodeURIComponent(sub || "");
  const categoryLabel = decodeURIComponent(category || "");

  const matched = useMemo(() => {
    const items = laws ?? [];
    const term = (subLabel || categoryLabel).toLowerCase();
    if (!term) return items;
    return items.filter((l: any) => {
      const hay = [l.titulo, l.objetivo, l.detalles].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [laws, subLabel, categoryLabel]);

  const ranking = useMemo(() => {
    return [...matched].sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 5);
  }, [matched]);

  return (
    <div className="rounded-2xl border p-6 md:p-8 mt-6 bg-card">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => (onClose ? onClose() : navigate(-1))}
          className="px-3 py-1 rounded-full border bg-white/80 text-sm"
        >
          Volver
        </button>

        <div>
          <h3 className="text-2xl md:text-3xl font-semibold">{subLabel || categoryLabel}</h3>
          <p className="text-sm text-muted-foreground">Vista enfocada en el subapartado seleccionado</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 border rounded-md bg-background p-4">
          <h4 className="font-medium mb-3">Leyes relacionadas ({matched.length})</h4>

          {isLoading && <div className="text-sm text-muted-foreground">Cargando…</div>}

          {!isLoading && matched.length === 0 && (
            <div className="text-sm text-muted-foreground">No se encontraron leyes para este subapartado.</div>
          )}

          {!isLoading && matched.length > 0 && (
            <ul className="space-y-3">
              {matched.map((l: any) => (
                <li key={l.id} className="rounded-lg border p-3 bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h5 className="font-medium text-base">{l.titulo}</h5>
                      <p className="text-sm text-muted-foreground mt-1">{l.objetivo}</p>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <div className="rounded-full border px-3 py-0.5 text-sm bg-white">▲ {l.upvotes}</div>
                      <div className="text-xs text-muted-foreground mt-2">{new Date(l.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="md:col-span-1 border rounded-md bg-background p-4">
          <h4 className="font-medium mb-3">Top 5 más votadas</h4>
          {isLoading && <div className="text-sm text-muted-foreground">Cargando…</div>}

          {!isLoading && ranking.length === 0 && (
            <div className="text-sm text-muted-foreground">No hay resultados</div>
          )}

          {!isLoading && ranking.length > 0 && (
            <ol className="space-y-2">
              {ranking.map((r: any, idx: number) => (
                <li key={r.id} className="flex items-start gap-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream-200 text-sm font-semibold">{idx + 1}</div>
                  <div className="flex-1">
                    <div className="font-medium text-sm truncate">{r.titulo}</div>
                    <div className="text-xs text-muted-foreground">▲ {r.upvotes} • {new Date(r.createdAt).toLocaleDateString()}</div>
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
