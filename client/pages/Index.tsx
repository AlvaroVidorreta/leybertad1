import AppLayout from "@/components/layout/AppLayout";
import QuoteRotator from "@/components/QuoteRotator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { comentarLey, crearLey, guardarLey, obtenerRanking, obtenerRecientes, votarLey } from "@/lib/api";
import { Law, TimeRange } from "@shared/api";
import { useMemo, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Index() {
  return (
    <AppLayout>
      <HeroPublicar />
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section id="recientes" className="lg:col-span-2">
          <FeedRecientes />
        </section>
        <aside className="lg:col-span-1">
          <Ranking />
        </aside>
      </div>
    </AppLayout>
  );
}

function HeroPublicar() {
  const qc = useQueryClient();
  const [expand, setExpand] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [detalles, setDetalles] = useState("");
  const [apodo, setApodo] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const crear = useMutation({
    mutationFn: crearLey,
    onSuccess: () => {
      setTitulo("");
      setObjetivo("");
      setDetalles("");
      setApodo("");
      setExpand(false);
      qc.invalidateQueries({ queryKey: ["recientes"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
  });

  const canSubmit = titulo.trim().length > 0 && objetivo.trim().length > 3 && !crear.isPending;

  // collapse to initial state when user leaves inputs and all are empty
  useEffect(() => {
    return () => {};
  }, []);

  function handlePossibleCollapse() {
    // slight delay so focus switching between inputs doesn't collapse
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (containerRef.current && active && containerRef.current.contains(active)) return;
      if (titulo.trim() || objetivo.trim() || detalles.trim() || apodo.trim()) return;
      setExpand(false);
    }, 120);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-tr from-cream-50 to-cream-100 p-6 md:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-brand text-4xl md:text-5xl text-primary mb-4">Leybertad</h2>
        <QuoteRotator />
        <div className="mt-6">
          <div ref={containerRef} className="relative mx-auto max-w-2xl">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value.slice(0, 40))}
              maxLength={40}
              onFocus={() => setExpand(true)}
              onBlur={handlePossibleCollapse}
              placeholder="Introduce Ley (título de tu propuesta)"
              className="w-full rounded-full border bg-white/80 backdrop-blur px-5 pr-24 py-3 text-base md:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              disabled={!canSubmit}
              onClick={() => crear.mutate({ titulo, objetivo, detalles: detalles || undefined, apodo: apodo || undefined })}
              className={cn(
                "absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm md:text-base disabled:opacity-50 disabled:pointer-events-none transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-primary/30 overflow-hidden",
                canSubmit ? "group" : ""
              )}
            >
              {/* shine overlay only when enabled */}
              {canSubmit && (
                <span className="pointer-events-none absolute inset-y-0 left-[-80%] w-[180%] -skew-x-12 bg-gradient-to-r from-white/40 via-white/20 to-white/0 opacity-0 transition-all duration-300 ease-out group-hover:left-[120%] group-hover:opacity-40" />
              )}
              <span className="relative z-10">Publicar</span>
            </button>
          </div>
          <div className={`transition-all duration-300 ${expand ? "max-h-[400px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
              <input
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                onFocus={() => setExpand(true)}
                onBlur={handlePossibleCollapse}
                placeholder="Objetivo breve (requerido)"
                className="rounded-md border bg-white/80 px-4 py-2"
              />
              <input
                value={apodo}
                onChange={(e) => setApodo(e.target.value.slice(0, 16))}
                maxLength={16}
                onFocus={() => setExpand(true)}
                onBlur={handlePossibleCollapse}
                placeholder="Apodo (opcional)"
                className="rounded-md border bg-white/80 px-4 py-2 md:justify-self-end md:w-40"
              />
            </div>
            <textarea
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              onFocus={() => setExpand(true)}
              onBlur={handlePossibleCollapse}
              placeholder="Perspectiva personal / detalles (recomendado)"
              className="mt-3 w-full rounded-md border bg-white/80 px-4 py-2 min-h-[80px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedRecientes() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["recientes"], queryFn: obtenerRecientes });

  const votar = useMutation({
    mutationFn: votarLey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recientes"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
  });

  const guardar = useMutation({
    mutationFn: guardarLey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recientes"] });
    },
  });

  const comentar = useMutation({
    mutationFn: ({ id, texto }: { id: string; texto: string }) => comentarLey(id, { texto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recientes"] }),
  });

  return (
    <div className="rounded-2xl border bg-card p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-4">Más recientes</h3>
      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      <ul className="space-y-4">
        {data?.map((law) => (
          <li key={law.id} className="rounded-xl border p-4 bg-background/70">
            <LawCard law={law} onUpvote={() => votar.mutate(law.id)} onSave={() => guardar.mutate(law.id)} onComment={(t) => comentar.mutate({ id: law.id, texto: t })} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LawCard({ law, onUpvote, onSave, onComment }: { law: Law; onUpvote: () => void; onSave: () => void; onComment: (text: string) => void }) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0 && text.trim().length <= 200;
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-medium text-lg">{law.titulo}</h4>
          <p className="text-sm text-muted-foreground">Objetivo: {law.objetivo}</p>
          {law.detalles && <p className="mt-1 text-sm">{law.detalles}</p>}
          <div className="mt-2 text-xs text-muted-foreground">{new Date(law.createdAt).toLocaleString()} {law.apodo ? `· ${law.apodo}` : ""}</div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <button onClick={onUpvote} className="rounded-full border px-3 py-1 text-sm bg-white hover:bg-cream-50">▲ {law.upvotes}</button>
          <button onClick={onSave} className="rounded-full border px-3 py-1 text-sm bg-white hover:bg-cream-50">Guardar</button>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            placeholder="Comenta (máx. 200 caracteres)"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button disabled={!canSend} onClick={() => { onComment(text); setText(""); }} className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50">Enviar</button>
        </div>
        {law.comentarios.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-28 overflow-auto pr-1">
            {law.comentarios.slice().reverse().map((c) => (
              <li key={c.id} className="text-xs text-muted-foreground">• {c.texto}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Ranking() {
  const [range, setRange] = useState<TimeRange>("month");
  const { data, isLoading } = useQuery({ queryKey: ["ranking", range], queryFn: () => obtenerRanking(range) });
  const items = useMemo(() => data ?? [], [data]);
  const [selected, setSelected] = useState<null | Record<string, any>>(null);

  const ranges: { key: TimeRange; label: string }[] = [
    { key: "day", label: "Día" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
    { key: "all", label: "Histórico" },
  ];

  const [open, setOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ddRef.current) return;
      if (e.target instanceof Node && !ddRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="rounded-2xl border bg-card p-4 md:p-6">
      <div className="flex items-center">
        <h3 className="text-lg font-semibold">Ranking</h3>
        <div className="ml-auto relative" ref={ddRef}>
          <button
            onClick={() => setOpen((s) => !s)}
            className="px-3 py-1 rounded-full border text-xs bg-white flex items-center gap-2"
            aria-expanded={open}
          >
            {ranges.find((r) => r.key === range)?.label ?? "Filtrar"}
            <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow-lg z-50">
              {ranges.map((r) => (
                <button
                  key={r.key}
                  onClick={() => { setRange(r.key); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm ${range === r.key ? "bg-primary text-primary-foreground" : "hover:bg-gray-50"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && <p className="mt-3 text-sm text-muted-foreground">Cargando…</p>}

      <ol className="mt-4 space-y-3">
        {items.map((l, i) => (
          <li
            key={l.id}
            onClick={() => setSelected(l)}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-white/40 transition-colors transition-shadow duration-150 cursor-pointer"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cream-200 text-xs font-semibold">{i + 1}</span>

            <div className="flex-1 px-2">
              <p className="font-medium text-sm text-center truncate">{l.titulo}</p>
            </div>

            <div className="ml-2 flex items-center">
              <div className="text-xs text-muted-foreground mr-2">{l.upvotes} votos</div>
            </div>
          </li>
        ))}

        {items.length === 0 && !isLoading && (
          <li className="text-sm text-muted-foreground">Aún no hay datos.</li>
        )}
      </ol>

      {/* Modal / detail display */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-[min(720px,95%)] rounded-2xl bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold">{selected.titulo}</h4>
                <p className="text-sm text-muted-foreground">{selected.upvotes} votos</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground">Cerrar</button>
            </div>

            <hr className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-muted-foreground">Objetivo</h5>
                <p className="mt-1">{selected.objetivo}</p>

                {selected.detalles && (
                  <>
                    <h5 className="text-sm font-medium text-muted-foreground mt-4">Detalles</h5>
                    <p className="mt-1 text-sm">{selected.detalles}</p>
                  </>
                )}
              </div>

              <div>
                <h5 className="text-sm font-medium text-muted-foreground">Metadatos</h5>
                <ul className="mt-1 text-sm">
                  <li>Autor: {selected.apodo ?? "—"}</li>
                  <li>ID: {selected.id}</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 text-right">
              <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function labelRange(r: TimeRange) {
  switch (r) {
    case "day":
      return "Día";
    case "week":
      return "Semana";
    case "month":
      return "Mes";
    case "semester":
      return "Semestre";
    default:
      return "Siempre";
  }
}
