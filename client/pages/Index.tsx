import AppLayout from "@/components/layout/AppLayout";
import { lazy, Suspense, useMemo, useState, useRef, useEffect, useCallback, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { comentarLey, crearLey, guardarLey, obtenerRanking, obtenerRecientes, votarLey } from "@/lib/api";
import { Law, TimeRange } from "@shared/api";
const QuoteRotator = lazy(() => import("@/components/QuoteRotator"));
import { cn } from "@/lib/utils";
import BibliotecaSub from "./BibliotecaSub";

const ITEM_HEIGHT_RANKING = 64;
const MAX_RANKING_ITEMS = 5;
const LIST_MAX_HEIGHT = ITEM_HEIGHT_RANKING * MAX_RANKING_ITEMS; // exact pixel height to fit MAX_RANKING_ITEMS without scrollbar

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

      {/* Separator and placeholder for "Últimas leyes" section */}
      <div className="mt-12 border-t border-border pt-10" aria-hidden="true" />

      <UltimasLeyes />
    </AppLayout>
  );
}

function UltimasLeyes() {
  const { data: allLaws, isLoading } = useQuery({ queryKey: ["recientes"], queryFn: obtenerRecientes, staleTime: 10000, refetchOnWindowFocus: false });
  const [qAll, setQAll] = useState("");
  const [qApproved, setQApproved] = useState("");
  const [mode, setMode] = useState<"all" | "approved">("all");

  // debounced search terms to reduce recompute while typing
  const [debouncedQAll, setDebouncedQAll] = useState("");
  const [debouncedQApproved, setDebouncedQApproved] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQAll(qAll.trim()), 250);
    return () => clearTimeout(t);
  }, [qAll]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQApproved(qApproved.trim()), 250);
    return () => clearTimeout(t);
  }, [qApproved]);

  const isFlipped = mode === "approved";
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const items = allLaws ?? [];
    const termRaw = isFlipped ? debouncedQApproved : debouncedQAll;
    const term = (termRaw || "").toLowerCase();
    const dayMs = 24 * 60 * 60 * 1000;
    if (!term && mode === "all") return items;

    return items.filter((l) => {
      if (mode === "approved") {
        const recent = Date.now() - Date.parse(l.createdAt) <= 30 * dayMs;
        if (!(l.upvotes && l.upvotes > 0 && recent)) return false;
      }

      if (!term) return true;
      const hay = [l.titulo, l.objetivo, l.detalles].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [allLaws, debouncedQAll, debouncedQApproved, mode, isFlipped]);

  // 12 main categories (minipaneles) and their subtopics
  const categories = [
    { title: "Economía", subs: ["Presupuestos", "Impuestos", "Salarios Públicos", "Subvenciones"] },
    { title: "Política Exterior", subs: ["Relaciones", "Acuerdos", "Diplomacia", "Tratados"] },
    { title: "Forma de Gobierno", subs: ["Constitución", "Reformas", "Instituciones", "Competencias"] },
    { title: "Impuestos", subs: ["Directos", "Indirectos", "Incentivos", "Fraude"] },
    { title: "Sanidad", subs: ["Financiación", "Acceso", "Recursos", "Salud Pública"] },
    { title: "Educación", subs: ["Currículo", "Financiación", "Acceso", "Formación"] },
    { title: "Medio Ambiente", subs: ["Energía", "Protección", "Residuos", "Clima"] },
    { title: "Justicia", subs: ["Reformas", "Acceso", "Procesal", "Penal"] },
    { title: "Transporte", subs: ["Infraestructura", "Movilidad", "Subvenciones", "Regulación"] },
    { title: "Innovación", subs: ["I+D", "Startups", "Patentes", "Digitalización"] },
    { title: "Trabajo", subs: ["Contratos", "Salarios", "Sindicación", "Seguridad"] },
    { title: "Agricultura", subs: ["Subvenciones", "Regulación", "Comercio", "Sostenibilidad"] },
  ];

  return (
    <section id="ultimas-leyes" className="relative">
      <div className="w-full">
        <div className="flip-3d">
          <div className={`flip-3d-inner ${isFlipped ? "is-flipped" : ""}`}>
            {/* FRONT FACE - default (light) */}
            <div className="flip-face front rounded-2xl border p-6 md:p-8 mt-6 bg-gradient-to-tr from-cream-50 to-cream-100">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-1">Biblioteca <span className="italic font-normal text-lg md:text-xl">Leybertad</span></h3>
                  <p className="text-sm text-muted-foreground">Busca y explora la biblioteca de leyes de Leybertad.</p>
                </div>

                <div className="md:w-96 w-full">
                  <div className="relative">
                    <input
                      value={qAll}
                      onChange={(e) => setQAll(e.target.value)}
                      aria-label="Buscar en últimas leyes"
                      placeholder="Buscar en Biblioteca..."
                      className="w-full rounded-full border bg-white/80 backdrop-blur px-5 pr-28 py-3 text-base md:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button onClick={() => {}} className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm">Buscar</button>
                  </div>

                  <div className="mt-3 flex gap-2 justify-end">
                    <button onClick={() => setMode("all")} className={`px-3 py-1 rounded-full border text-sm ${mode === "all" ? "bg-primary text-primary-foreground" : "bg-white"}`}>Leybertad</button>
                    <button onClick={() => setMode("approved")} className={`px-3 py-1 rounded-full border text-sm ${mode === "approved" ? "bg-primary text-primary-foreground" : "bg-white"}`}>Aprobadas (España)</button>
                  </div>
                </div>
              </div>

              <div className="mt-6 w-full rounded-md bg-background/50 p-4">
                {isLoading && <div className="p-6 text-sm text-muted-foreground">Cargando…</div>}

                {/* Category grid: 3 rows x 4 cols */}
                {!isLoading && (
                  activeSub ? (
                    <BibliotecaSub categoryProp={activeSub.category} subProp={activeSub.sub} onClose={() => setActiveSub(null)} />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {categories.map((c, i) => (
                        <div
                          key={c.title}
                          className="relative rounded-md border bg-card overflow-hidden aspect-square flex items-center justify-center text-center p-3 cursor-pointer group"
                          role="button"
                          aria-label={`Ver subtemas de ${c.title}`}
                        >
                          <div className="z-10 transition-opacity duration-200 group-hover:opacity-0">
                            <span className="text-sm md:text-base font-semibold tracking-widest">{c.title}</span>
                          </div>

                          {/* Hover overlay showing subtopics as horizontal bars */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-full px-4">
                              <div className="flex flex-col items-stretch gap-2">
                                {c.subs.map((s) => (
                                  <div key={s} onClick={(e) => { e.stopPropagation(); setActiveSub({ category: c.title, sub: s }); }} className="bg-cream-50 text-foreground text-sm rounded-full px-3 py-1 shadow-sm transform transition-all duration-150 ease-out hover:-translate-y-1 hover:scale-[1.01] cursor-pointer">{s}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {!isLoading && filtered.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground">No se encontraron leyes.</div>
                )}
              </div>
            </div>

            {/* BACK FACE - dark themed for "Últimas aprobadas" */}
            <div className="flip-face back rounded-2xl border p-6 md:p-8 mt-6 bg-gradient-to-tr from-gray-900 to-gray-800 text-white">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-1">Biblioteca <span className="italic font-normal text-lg md:text-xl">España</span></h3>
                  <p className="text-sm text-gray-200">Busca y explora las últimas leyes aprobadas en España.</p>
                </div>

                <div className="md:w-96 w-full">
                  <div className="relative">
                    <input
                      value={qApproved}
                      onChange={(e) => setQApproved(e.target.value)}
                      aria-label="Buscar en últimas aprobadas"
                      placeholder="Buscar en Últimas aprobadas..."
                      className="w-full rounded-full border bg-white/5 px-5 pr-28 py-3 text-base md:text-lg text-white placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <button onClick={() => {}} className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm">Buscar</button>
                  </div>

                  <div className="mt-3 flex gap-2 justify-end">
                    <button onClick={() => setMode("all")} className={`px-3 py-1 rounded-full border text-sm ${mode === "all" ? "bg-primary text-primary-foreground" : "bg-transparent text-white"}`}>Leybertad</button>
                    <button onClick={() => setMode("approved")} className={`px-3 py-1 rounded-full border text-sm ${mode === "approved" ? "bg-primary text-primary-foreground" : "bg-transparent text-white"}`}>Aprobadas (España)</button>
                  </div>
                </div>
              </div>

              <div className="mt-6 w-full rounded-md bg-white/3 p-4">
                {isLoading && <div className="p-6 text-sm text-gray-300">Cargando…</div>}

                {/* Dark variant of the category grid */}
                {!isLoading && (
                  activeSub ? (
                    <BibliotecaSub categoryProp={activeSub.category} subProp={activeSub.sub} onClose={() => setActiveSub(null)} />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {categories.map((c) => (
                        <div key={c.title} className="relative rounded-md border bg-[#0b1220] overflow-hidden aspect-square flex items-center justify-center text-center p-3 cursor-pointer group">
                          <div className="z-10 text-white transition-opacity duration-200 group-hover:opacity-0">
                            <span className="text-sm md:text-base font-semibold tracking-widest">{c.title}</span>
                          </div>

                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-full px-4">
                              <div className="flex flex-col items-stretch gap-2">
                                {c.subs.map((s) => (
                                  <div key={s} onClick={(e) => { e.stopPropagation(); setActiveSub({ category: c.title, sub: s }); }} className="bg-white/20 text-white text-sm rounded-full px-3 py-1 shadow-sm transform transition-all duration-150 ease-out hover:-translate-y-1 hover:scale-[1.01] cursor-pointer">{s}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {!isLoading && filtered.length === 0 && (
                  <div className="p-6 text-sm text-gray-300">No se encontraron leyes.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
  const detailsRef = useRef<HTMLDivElement | null>(null);

  const crear = useMutation({
    mutationFn: crearLey,
    onSuccess: (newLaw: Law) => {
      // reset inputs
      setTitulo("");
      setObjetivo("");
      setDetalles("");
      setApodo("");
      setExpand(false);

      // Optimistically prepend the new law to the recientes cache so it appears first with an entry animation
      qc.setQueryData<Law[] | undefined>(["recientes"], (old) => {
        const normalized = old ? old.filter((l) => l.id !== newLaw.id) : [];
        return [{ ...newLaw, _isNew: true } as unknown as Law, ...normalized];
      });

      // update ranking separately
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
      if (detailsRef.current && active && detailsRef.current.contains(active)) return;
      if (titulo.trim() || objetivo.trim() || detalles.trim() || apodo.trim()) return;
      setExpand(false);
    }, 120);
  }

  return (
    <div className="relative overflow-hidden p-6 md:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-brand text-4xl md:text-5xl text-primary mb-4">Leybertad</h2>
        <Suspense fallback={<div aria-hidden className="h-6" />}>
          <QuoteRotator />
        </Suspense>
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
          <div ref={detailsRef} className={`transition-all duration-500 ${expand ? "max-h-[400px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
              <input
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                onFocus={() => setExpand(true)}
                onBlur={handlePossibleCollapse}
                placeholder="Objetivo breve (requerido)"
                className="rounded-md border bg-white/80 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <input
                value={apodo}
                onChange={(e) => setApodo(e.target.value.slice(0, 16))}
                maxLength={16}
                onFocus={() => setExpand(true)}
                onBlur={handlePossibleCollapse}
                placeholder="Apodo (opcional)"
                className="rounded-md border bg-white/80 px-4 py-2 md:justify-self-end md:w-40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <textarea
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              onFocus={() => setExpand(true)}
              onBlur={handlePossibleCollapse}
              placeholder="Perspectiva personal / detalles (recomendado)"
              className="mt-3 w-full rounded-md border bg-white/80 px-4 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { FixedSizeList as List } from 'react-window';

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

  // stable handlers to avoid creating new closures per item render
  const handleUpvote = useCallback((id: string) => votar.mutate(id), [votar]);
  const handleSave = useCallback((id: string) => guardar.mutate(id), [guardar]);
  const handleComment = useCallback((id: string, texto: string) => comentar.mutate({ id, texto }), [comentar]);

  const ITEM_SIZE_RECENT = 112; // estimated height per law card

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const law = data ? data[index] : null;
    if (!law) return null;
    return (
      <div style={style} className="px-0">
        <li className={`rounded-xl border p-3 bg-background/70 ${(law as any)?._isNew ? 'animate-insert' : ''}`}>
          <LawCard law={law} onUpvote={handleUpvote} onSave={handleSave} onComment={handleComment} />
        </li>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border bg-card p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-4">Más recientes</h3>
      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      <div className="pr-1">
        <List
          height={Math.min(LIST_MAX_HEIGHT, (data ? data.length : 0) * ITEM_SIZE_RECENT)}
          itemCount={data ? data.length : 0}
          itemSize={ITEM_SIZE_RECENT}
          width="100%"
        >
          {Row}
        </List>
      </div>
    </div>
  );
}

const LawCard = memo(function LawCard({ law, onUpvote, onSave, onComment }: { law: Law; onUpvote: (id: string) => void; onSave: (id: string) => void; onComment: (id: string, text: string) => void }) {
  const [text, setText] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const canSend = text.trim().length > 0 && text.trim().length <= 200;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="font-medium text-base">{law.titulo}</h4>
          <p className="text-sm text-muted-foreground">{law.objetivo}</p>
          {showCommentInput && law.detalles && <p className="mt-1 text-sm">{law.detalles}</p>}
        </div>

        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <button onClick={() => onUpvote(law.id)} aria-label="Upvote" className="rounded-full border px-3 py-0.5 text-sm bg-white hover:bg-cream-50">▲ {law.upvotes}</button>

          <div className="flex items-center gap-2 mt-2">
            {/* comment icon (left) */}
            <button onClick={() => setShowCommentInput((s) => !s)} aria-label="Comentar" className="rounded-full p-1 bg-white border hover:bg-gray-50">
              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {/* save icon (right) */}
            <button onClick={() => onSave(law.id)} aria-label="Guardar" className="rounded-full p-1 bg-white border hover:bg-gray-50">
              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 2h9a2 2 0 0 1 2 2v16l-7-3-7 3V4a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* comment input expands only when toggled */}
      <div className={`transition-all duration-200 overflow-hidden ${showCommentInput ? "max-h-40 mt-3 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            placeholder="Comenta (máx. 200 caracteres)"
            className="flex-1 rounded-md border px-2 py-1 text-sm focus:outline-none focus:border-primary"
          />
          <button disabled={!canSend} onClick={() => { onComment(law.id, text); setText(""); setShowCommentInput(false); }} className="rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm disabled:opacity-50">Enviar</button>
        </div>

        {showCommentInput && law.comentarios.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-20 overflow-auto pr-1">
            {law.comentarios.slice().reverse().map((c) => (
              <li key={c.id} className="text-xs text-muted-foreground">• {c.texto}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

function Ranking() {
  const [range, setRange] = useState<TimeRange>("month");
  const { data, isLoading } = useQuery({ queryKey: ["ranking", range], queryFn: () => obtenerRanking(range), staleTime: 30000, refetchOnWindowFocus: false });
  const items = useMemo(() => data ?? [], [data]);
  const displayedRanking = useMemo(() => items.slice(0, MAX_RANKING_ITEMS), [items]);
  const [selected, setSelected] = useState<null | Record<string, any>>(null);
  const [showComments, setShowComments] = useState(false);

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

      <div className="mt-4" style={{ height: `${LIST_MAX_HEIGHT}px` }}>
        <List
          height={LIST_MAX_HEIGHT}
          itemCount={displayedRanking.length}
          itemSize={ITEM_HEIGHT_RANKING}
          width="100%"
        >
          {({ index, style }: { index: number; style: React.CSSProperties }) => {
            const l = displayedRanking[index];
            return (
              <div style={style} className="px-0">
                <div
                  onClick={() => setSelected(l)}
                  className="flex items-center gap-4 rounded-lg p-3 hover:bg-white/40 transition-colors transition-shadow duration-150 cursor-pointer"
                >
                  <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cream-200 text-sm font-semibold">{index + 1}</span>

                  <div className="flex-1">
                    <p className="font-medium text-[0.95rem] text-left truncate">{l.titulo}</p>
                  </div>
                </div>
              </div>
            );
          }}
        </List>

        {items.length === 0 && !isLoading && (
          <div className="text-sm text-muted-foreground">Aún no hay datos.</div>
        )}
      </div>

      {/* Modal / detail display */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setSelected(null); setShowComments(false); }} />
          <div className="relative z-10 w-[min(720px,95%)] rounded-2xl bg-card p-6 shadow-xl">
            {/* Close X top-right */}
            <button
              onClick={() => { setSelected(null); setShowComments(false); }}
              aria-label="Cerrar"
              className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-muted-foreground hover:bg-white"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <div className="mb-2">
              <h4 className="text-lg font-semibold">{selected.titulo}</h4>
              <p className="text-sm text-muted-foreground">{selected.upvotes} votos</p>
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
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground">Autor</h5>
                    <p className="mt-1">{selected.apodo ?? "-"}</p>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => setShowComments((s) => !s)}
                      className="px-3 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
                    >
                      {showComments ? "Ocultar comentarios" : "Ver comentarios"}
                    </button>

                    {showComments && (
                      <div className="mt-3 max-h-40 overflow-auto rounded-md border bg-white p-2 text-sm">
                        {Array.isArray(selected.comentarios) && selected.comentarios.length > 0 ? (
                          selected.comentarios.map((c: any) => (
                            <div key={c.id} className="py-1 border-b last:border-b-0">{c.texto}</div>
                          ))
                        ) : (
                          <div className="text-muted-foreground">Sin comentarios</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
