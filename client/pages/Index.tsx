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

  const crear = useMutation({
    mutationFn: crearLey,
    onSuccess: () => {
      setTitulo("");
      setObjetivo("");
      setDetalles("");
      setApodo("");
      qc.invalidateQueries({ queryKey: ["recientes"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
  });

  const canSubmit = titulo.trim().length > 0 && objetivo.trim().length > 3 && !crear.isPending;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-tr from-cream-50 to-cream-100 p-6 md:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-brand text-4xl md:text-5xl text-primary mb-4">Leybertad</h2>
        <QuoteRotator />
        <div className="mt-6">
          <div className="relative mx-auto max-w-2xl">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onFocus={() => setExpand(true)}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="Objetivo breve (requerido)"
                className="rounded-md border bg-white/80 px-4 py-2"
              />
              <input
                value={apodo}
                onChange={(e) => setApodo(e.target.value)}
                placeholder="Apodo (opcional)"
                className="rounded-md border bg-white/80 px-4 py-2"
              />
            </div>
            <textarea
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Perspectiva personal / detalles (opcional)"
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
  const [range, setRange] = useState<TimeRange>("semester");
  const { data, isLoading } = useQuery({ queryKey: ["ranking", range], queryFn: () => obtenerRanking(range) });
  const items = useMemo(() => data ?? [], [data]);

  return (
    <div className="rounded-2xl border bg-card p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ranking</h3>
        <div className="flex gap-1">
          {(["day", "week", "month", "semester", "all"] as TimeRange[]).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded-full border text-xs ${range === r ? "bg-primary text-primary-foreground" : "bg-white"}`}>
              {labelRange(r)}
            </button>
          ))}
        </div>
      </div>
      {isLoading && <p className="mt-3 text-sm text-muted-foreground">Cargando…</p>}
      <ol className="mt-4 space-y-3">
        {items.map((l, i) => (
          <li key={l.id} className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-cream-200 text-xs">{i + 1}</span>
            <div>
              <p className="font-medium text-sm">{l.titulo}</p>
              <p className="text-xs text-muted-foreground">{l.upvotes} votos · {new Date(l.createdAt).toLocaleDateString()}</p>
            </div>
          </li>
        ))}
        {items.length === 0 && !isLoading && (
          <li className="text-sm text-muted-foreground">Aún no hay datos.</li>
        )}
      </ol>
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
