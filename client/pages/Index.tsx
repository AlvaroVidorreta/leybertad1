import AppLayout from "@/components/layout/AppLayout";
import {
  lazy,
  Suspense,
  useMemo,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  memo,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  comentarLey,
  crearLey,
  guardarLey,
  obtenerRanking,
  obtenerRecientes,
  votarLey,
} from "@/lib/api";
import { Law, TimeRange } from "@shared/api";
const QuoteRotator = lazy(() => import("@/components/QuoteRotator"));
import { cn } from "@/lib/utils";
import LawSummary from "@/components/LawSummary";
import BibliotecaSub from "./BibliotecaSub";
import AnalizadorPropuestas from "@/components/AnalizadorPropuestas";
import HorizontalCarousel from "@/components/HorizontalCarousel";
import useFirebaseAuth from "@/hooks/useFirebaseAuth";

const ITEM_HEIGHT_RANKING = 64;
const MAX_RANKING_ITEMS = 5;
const LIST_MAX_HEIGHT = ITEM_HEIGHT_RANKING * MAX_RANKING_ITEMS; // exact pixel height to fit MAX_RANKING_ITEMS without scrollbar

// Shared categories used across Biblioteca and publishing modal
const CATEGORIES = [
  {
    title: "Economía",
    subs: ["Presupuestos", "Impuestos", "Salarios Públicos", "Subvenciones"],
  },
  {
    title: "Política Exterior",
    subs: ["Relaciones", "Acuerdos", "Diplomacia", "Tratados"],
  },
  {
    title: "Forma de Gobierno",
    subs: ["Constitución", "Reformas", "Instituciones", "Competencias"],
  },
  {
    title: "Impuestos",
    subs: ["Directos", "Indirectos", "Incentivos", "Fraude"],
  },
  {
    title: "Sanidad",
    subs: ["Financiación", "Acceso", "Recursos", "Salud Pública"],
  },
  {
    title: "Educación",
    subs: ["Currículo", "Financiación", "Acceso", "Formación"],
  },
  {
    title: "Medio Ambiente",
    subs: ["Energía", "Protección", "Residuos", "Clima"],
  },
  { title: "Justicia", subs: ["Reformas", "Acceso", "Procesal", "Penal"] },
  {
    title: "Transporte",
    subs: ["Infraestructura", "Movilidad", "Subvenciones", "Regulación"],
  },
  {
    title: "Innovación",
    subs: ["I+D", "Startups", "Patentes", "Digitalización"],
  },
  {
    title: "Trabajo",
    subs: ["Contratos", "Salarios", "Sindicación", "Seguridad"],
  },
  {
    title: "Agricultura",
    subs: ["Subvenciones", "Regulación", "Comercio", "Sostenibilidad"],
  },
];

export default function Index() {
  const qc = useQueryClient();
  const [selectedLaw, setSelectedLaw] = useState<Law | null>(null);
  const [showComments, setShowComments] = useState(false);

  const comentar = useMutation({
    mutationFn: ({ id, texto }: { id: string; texto: string }) =>
      comentarLey(id, { texto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recientes"] }),
    onError: (err: any) => {
      try {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('autentic') || msg.includes('token')) {
          // request login
          window.dispatchEvent(new CustomEvent('open-auth'));
        }
      } catch (e) {}
    },
  });

  // add vote/save mutations at page level so modal can call them safely
  const votar = useMutation({
    mutationFn: (id: string) => votarLey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recientes"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
  });
  const guardar = useMutation({
    mutationFn: (id: string) => guardarLey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recientes"] }),
  });

  const handleUpvote = useCallback((id: string) => votar.mutate(id), [votar]);
  const handleSave = useCallback((id: string) => guardar.mutate(id), [guardar]);

  const handleOpenLaw = (law: Law, openComments = false) => {
    setSelectedLaw(law);
    setShowComments(openComments);
  };
  const handleCloseLaw = () => {
    setSelectedLaw(null);
    setShowComments(false);
  };

  return (
    <AppLayout>
      <HeroPublicar />
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section id="recientes" className="lg:col-span-2">
          <FeedRecientes
            onOpenLaw={handleOpenLaw}
            onComment={(id, texto) => comentar.mutate({ id, texto })}
          />
        </section>
        <aside className="lg:col-span-1">
          <Ranking
            onOpenLaw={handleOpenLaw}
            selectedLaw={selectedLaw}
            showComments={showComments}
            setSelectedLaw={setSelectedLaw}
            setShowComments={setShowComments}
            onComment={(id, texto) => comentar.mutate({ id, texto })}
            onUpvote={handleUpvote}
            onSave={handleSave}
          />
        </aside>
      </div>

      {/* Separator and placeholder for "Últimas leyes" section */}
      <div className="mt-12 border-t border-border pt-10" aria-hidden="true" />

      <UltimasLeyes onOpenLaw={handleOpenLaw} />
    </AppLayout>
  );
}

function UltimasLeyes({
  onOpenLaw,
}: {
  onOpenLaw: (law: Law, openComments?: boolean) => void;
}) {
  const { data: allLaws, isLoading } = useQuery({
    queryKey: ["recientes"],
    queryFn: obtenerRecientes,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });
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
  const [activeSub, setActiveSub] = useState<{
    category: string;
    sub: string;
  } | null>(null);

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
      const hay = [l.titulo, l.objetivo, l.detalles]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [allLaws, debouncedQAll, debouncedQApproved, mode, isFlipped]);

  // 12 main categories (minipaneles) and their subtopics
  const categories = CATEGORIES;
  const warmPalettes = [
    "bg-cream-50",
    "bg-cream-100",
    "bg-cream-200",
    "bg-cream-300",
    "bg-cream-100",
    "bg-cream-200",
    "bg-cream-50",
    "bg-cream-300",
    "bg-cream-100",
    "bg-cream-200",
    "bg-cream-50",
    "bg-cream-400",
  ];

  return (
    <section id="ultimas-leyes" className="relative">
      <div className="w-full">
        <div className="flip-3d">
          <div className={`flip-3d-inner ${isFlipped ? "is-flipped" : ""}`}>
            {/* FRONT FACE - default (light) */}
            <div className="flip-face front rounded-2xl border p-6 md:p-6 mt-4 bg-white">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-1">
                    Biblioteca{" "}
                    <span className="italic font-normal text-lg md:text-xl">
                      Leybertad
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Busca y explora la biblioteca de leyes de Leybertad.
                  </p>
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
                    <button
                      onClick={() => {}}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm group overflow-hidden transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <span className="pointer-events-none absolute inset-y-0 left-[-80%] w-[180%] -skew-x-12 bg-gradient-to-r from-white/40 via-white/20 to-white/0 opacity-0 transition-all duration-300 ease-out group-hover:left-[120%] group-hover:opacity-40" />
                      <span className="relative z-10">Buscar</span>
                    </button>
                  </div>

                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      onClick={() => setMode("all")}
                      className={`px-3 py-1 rounded-full border text-sm ${mode === "all" ? "bg-primary text-primary-foreground" : "bg-white"}`}
                    >
                      Leybertad
                    </button>
                    <button
                      onClick={() => setMode("approved")}
                      className={`px-3 py-1 rounded-full border text-sm ${mode === "approved" ? "bg-primary text-primary-foreground" : "bg-white"}`}
                    >
                      Aprobadas (España)
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 w-full">
                {isLoading && (
                  <div className="p-6 text-sm text-muted-foreground">
                    Cargando…
                  </div>
                )}

                {/* Category carousel: single-row 12 tiles with continuous scroll */}
                {!isLoading &&
                  (activeSub ? (
                    <BibliotecaSub
                      categoryProp={activeSub.category}
                      subProp={activeSub.sub}
                      onClose={() => setActiveSub(null)}
                      onOpenLaw={onOpenLaw}
                    />
                  ) : (
                    <HorizontalCarousel
                      categories={categories}
                      warmPalettes={warmPalettes}
                      onSelectSub={(category, sub) =>
                        setActiveSub({ category, sub })
                      }
                    />
                  ))}

                {!isLoading && filtered.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground">
                    No se encontraron leyes.
                  </div>
                )}
              </div>
            </div>

            {/* BACK FACE - dark themed for "Últimas aprobadas" */}
            <div className="flip-face back rounded-2xl border p-6 md:p-6 mt-4 bg-gradient-to-tr from-gray-900 to-gray-800 text-white">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-1">
                    Biblioteca{" "}
                    <span className="italic font-normal text-lg md:text-xl">
                      España
                    </span>
                  </h3>
                  <p className="text-sm text-gray-200">
                    Busca y explora las últimas leyes aprobadas en España.
                  </p>
                </div>

                <div className="md:w-96 w-full">
                  <div className="relative">
                    <input
                      value={isFlipped ? (typeof (window as any).__ANALYZER_TMP_Q__ !== 'undefined' ? (window as any).__ANALYZER_TMP_Q__ : qApproved) : qApproved}
                      onChange={(e) => {
                        if (isFlipped) {
                          // when flipped, keep local analyzerQ in window var to avoid changing existing qApproved logic
                          (window as any).__ANALYZER_TMP_Q__ = e.target.value;
                          // also update debounced value used elsewhere
                          setQApproved(e.target.value);
                        } else {
                          setQAll(e.target.value);
                        }
                      }}
                      aria-label={isFlipped ? "Analizar propuesta" : "Buscar en últimas aprobadas"}
                      placeholder={isFlipped ? "Analizar propuesta..." : "Buscar en Últimas aprobadas..."}
                      className="w-full rounded-full border bg-white/5 px-5 pr-28 py-3 text-base md:text-lg text-white placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <button
                      onClick={() => {
                        if (isFlipped) {
                          // trigger global analyzer event by incrementing a custom event on window
                          const ev = new CustomEvent('analyzer:trigger', { detail: { q: (window as any).__ANALYZER_TMP_Q__ || qApproved } });
                          window.dispatchEvent(ev);
                        } else {
                          // placeholder for search in front face
                        }
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm group overflow-hidden transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <span className="pointer-events-none absolute inset-y-0 left-[-80%] w-[180%] -skew-x-12 bg-gradient-to-r from-white/40 via-white/20 to-white/0 opacity-0 transition-all duration-300 ease-out group-hover:left-[120%] group-hover:opacity-40" />
                      <span className="relative z-10">{isFlipped ? 'Analizar' : 'Buscar'}</span>
                    </button>
                  </div>

                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      onClick={() => setMode("all")}
                      className={`px-3 py-1 rounded-full border text-sm ${mode === "all" ? "bg-primary text-primary-foreground" : "bg-transparent text-white"}`}
                    >
                      Leybertad
                    </button>
                    <button
                      onClick={() => setMode("approved")}
                      className={`px-3 py-1 rounded-full border text-sm ${mode === "approved" ? "bg-primary text-primary-foreground" : "bg-transparent text-white"}`}
                    >
                      Aprobadas (España)
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <AnalizadorPropuestas />
              </div>

              <div className="mt-4" />
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

  const canSubmit =
    titulo.trim().length > 0 && objetivo.trim().length > 3 && !crear.isPending;

  // recommended extra step modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [chosenCategory, setChosenCategory] = useState<string | null>(null);
  const [chosenSub, setChosenSub] = useState<string | null>(null);

  // collapse to initial state when user leaves inputs and all are empty
  useEffect(() => {
    return () => {};
  }, []);

  function handlePossibleCollapse() {
    // slight delay so focus switching between inputs doesn't collapse
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (
        containerRef.current &&
        active &&
        containerRef.current.contains(active)
      )
        return;
      if (detailsRef.current && active && detailsRef.current.contains(active))
        return;
      if (titulo.trim() || objetivo.trim() || detalles.trim() || apodo.trim())
        return;
      setExpand(false);
    }, 120);
  }

  function openPublishModal() {
    setChosenCategory(null);
    setChosenSub(null);
    setShowCategoryModal(true);
  }

  function confirmPublish() {
    setShowCategoryModal(false);
    crear.mutate({
      titulo,
      objetivo,
      detalles: detalles || undefined,
      apodo: apodo || undefined,
      category: chosenCategory || undefined,
      subcategory: chosenSub || undefined,
    } as any);
  }

  return (
    <div className="relative overflow-hidden p-6 md:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-brand text-4xl md:text-5xl text-primary mb-4">
          Leybertad
        </h2>
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
              placeholder="Introduce Ley o Propuesta (título)"
              className="w-full rounded-full border bg-white/80 backdrop-blur px-5 pr-24 py-3 text-base md:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              disabled={!canSubmit}
              onClick={openPublishModal}
              className={cn(
                "absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm md:text-base disabled:opacity-50 disabled:pointer-events-none transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-primary/30 overflow-hidden",
                canSubmit ? "group" : "",
              )}
            >
              {/* shine overlay only when enabled */}
              {canSubmit && (
                <span className="pointer-events-none absolute inset-y-0 left-[-80%] w-[180%] -skew-x-12 bg-gradient-to-r from-white/40 via-white/20 to-white/0 opacity-0 transition-all duration-300 ease-out group-hover:left-[120%] group-hover:opacity-40" />
              )}
              <span className="relative z-10">Publicar</span>
            </button>
          </div>
          <div
            ref={detailsRef}
            className={`transition-all duration-500 ${expand ? "max-h-[400px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}
          >
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
              placeholder="Detalles / Perspectiva personal / Impacto estimado (recomendado)"
              className="mt-3 w-full rounded-md border bg-white/80 px-4 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Category selection modal (recommended extra step) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCategoryModal(false)}
          />

          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-card/80 backdrop-blur-md border p-6 shadow-xl">
            <h4 className="text-lg font-semibold">
              Elige una categoría (recomendado)
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Selecciona la categoría que mejor describa tu propuesta.
            </p>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 p-2 category-grid">
              {CATEGORIES.map((c) => (
                <button
                  key={c.title}
                  onClick={() => {
                    setChosenCategory(c.title);
                    setChosenSub(null);
                  }}
                  className={`text-left w-full rounded-lg border px-3 py-2 bg-white/80 hover:bg-white ${chosenCategory === c.title ? "category-selected" : ""}`}
                >
                  <div className="font-medium text-sm truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {c.subs.slice(0, 2).join(" · ")}
                  </div>
                </button>
              ))}
            </div>

            {chosenCategory && (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">
                  Etiquetas en{" "}
                  <strong className="text-foreground">{chosenCategory}</strong>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    CATEGORIES.find((c) => c.title === chosenCategory)?.subs ||
                    []
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => setChosenSub(s)}
                      className={`text-sm px-3 py-1 rounded-full border ${chosenSub === s ? "bg-primary text-primary-foreground" : "bg-white/80"}`}
                    >
                      {s}
                    </button>
                  ))}
                  {/* 'Otro' option */}
                  <button
                    key="otro"
                    onClick={() => setChosenSub("Otro")}
                    className={`text-sm px-3 py-1 rounded-full border ${chosenSub === "Otro" ? "bg-primary text-primary-foreground" : "bg-white/80"}`}
                  >
                    Otro
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  crear.mutate({
                    titulo,
                    objetivo,
                    detalles: detalles || undefined,
                    apodo: apodo || undefined,
                  } as any);
                }}
                className="px-3 py-2 rounded-md border bg-white btn-micro-raise"
              >
                Publicar sin categoría
              </button>
              <button
                onClick={confirmPublish}
                disabled={!!crear.isPending}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50 btn-micro-shimmer"
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { FixedSizeList as List } from "react-window";

function FeedRecientes({
  onOpenLaw,
  onComment,
}: {
  onOpenLaw: (law: Law, openComments?: boolean) => void;
  onComment: (id: string, texto: string) => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["recientes"],
    queryFn: obtenerRecientes,
  });

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

  // stable handlers to avoid creating new closures per item render
  const handleUpvote = useCallback((id: string) => votar.mutate(id), [votar]);
  const handleSave = useCallback((id: string) => guardar.mutate(id), [guardar]);

  const ITEM_SIZE_RECENT = 104; // estimated height per law card (slightly reduced spacing by ~1/4 of the inter-item gap)

  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const law = data ? data[index] : null;
    if (!law) return null;
    return (
      <div style={style} className="px-0 py-0.5">
        <li
          className={`list-none rounded-xl border pl-6 pr-3 py-3 bg-background/70 ${(law as any)?._isNew ? "animate-insert" : ""}`}
        >
          <LawCard
            law={law}
            onUpvote={handleUpvote}
            onSave={handleSave}
            onOpen={onOpenLaw}
          />
        </li>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border bg-card p-4 md:p-6">
      <h3 className="text-xl font-bold mb-4">Más recientes</h3>
      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      <div className="pr-1 recent-scroll">
        <List
          height={Math.min(
            LIST_MAX_HEIGHT,
            (data ? data.length : 0) * ITEM_SIZE_RECENT,
          )}
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

const LawCard = memo(function LawCard({
  law,
  onUpvote,
  onSave,
  onOpen,
}: {
  law: Law;
  onUpvote: (id: string) => void;
  onSave: (id: string) => void;
  onOpen: (law: Law, openComments?: boolean) => void;
}) {
  return (
    <div className="h-full">
      <div className="flex items-center justify-between gap-3 h-full">
        <div
          className="flex-1 min-w-0 pr-14 cursor-pointer"
          onClick={() => onOpen(law)}
        >
          <LawSummary title={law.titulo} objetivo={law.objetivo} />
        </div>

        <div className="flex-shrink-0 flex flex-col items-center gap-1 -ml-5 -translate-x-1">
          <button
            onClick={() => onUpvote(law.id)}
            aria-label="Upvote"
            className="rounded-full border bg-white hover:bg-cream-50 inline-flex items-center justify-center px-3 py-0.5 text-sm min-w-[4rem]"
          >
            ▲ {law.upvotes}
          </button>

          <div className="flex items-center gap-2 mt-1">
            {/* comment icon (left) */}
            <button
              onClick={() => onOpen(law, true)}
              aria-label="Perspectivas"
              className="rounded-full bg-white border hover:bg-gray-50 inline-flex items-center justify-center w-8 h-8"
            >
              <svg
                className="w-4 h-4 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* save icon (right) */}
            <button
              onClick={() => onSave(law.id)}
              aria-label="Guardar"
              className="rounded-full bg-white border hover:bg-gray-50 inline-flex items-center justify-center w-8 h-8"
            >
              <svg
                className="w-4 h-4 text-muted-foreground transform translate-x-[1px]"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 2h9a2 2 0 0 1 2 2v16l-7-3-7 3V4a2 2 0 0 1 2-2z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

function Ranking({
  onOpenLaw,
  selectedLaw,
  showComments,
  setSelectedLaw,
  setShowComments,
  onComment,
  onUpvote,
  onSave,
}: {
  onOpenLaw: (law: Law, openComments?: boolean) => void;
  selectedLaw: Law | null;
  showComments: boolean;
  setSelectedLaw: (l: Law | null) => void;
  setShowComments: (s: boolean) => void;
  onComment: (id: string, texto: string) => void;
  onUpvote?: (id: string) => void;
  onSave?: (id: string) => void;
}) {
  const [range, setRange] = useState<TimeRange>("month");
  const { data, isLoading } = useQuery({
    queryKey: ["ranking", range],
    queryFn: () => obtenerRanking(range),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  const items = useMemo(() => data ?? [], [data]);
  const displayedRanking = useMemo(
    () => items.slice(0, MAX_RANKING_ITEMS),
    [items],
  );

  const ranges: { key: TimeRange; label: string }[] = [
    { key: "day", label: "Día" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
    { key: "all", label: "Histórico" },
  ];

  const [open, setOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement | null>(null);
  const commentRef = useRef<HTMLInputElement | null>(null);

  const qc = useQueryClient();
  // related laws for the modal aside — only show relations when category or subcategory match, up to 5
  const relatedLaws = useMemo(() => {
    if (!selectedLaw) return [] as Law[];
    const all = qc.getQueryData<Law[]>(["recientes"]) || [];
    const others = all.filter((l) => l.id !== selectedLaw.id);

    const selCat = (selectedLaw as any).category;
    const selSub = (selectedLaw as any).subcategory;

    if (!selCat && !selSub) return [] as Law[];

    const same = others.filter((l) => {
      const lcat = (l as any).category;
      const lsub = (l as any).subcategory;
      return (selCat && lcat && lcat === selCat) || (selSub && lsub && lsub === selSub);
    });

    // return up to 5 related laws when matching by category or subcategory
    return same.slice(0, 5);
  }, [selectedLaw, qc]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ddRef.current) return;
      if (e.target instanceof Node && !ddRef.current.contains(e.target))
        setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="rounded-2xl border bg-card p-4 md:p-6">
      <div className="flex items-center">
        <h3 className="text-xl font-bold">Ranking</h3>
        <div className="ml-auto relative" ref={ddRef}>
          <button
            onClick={() => setOpen((s) => !s)}
            className="px-3 py-1 rounded-full border text-xs bg-white flex items-center gap-2"
            aria-expanded={open}
          >
            {ranges.find((r) => r.key === range)?.label ?? "Filtrar"}
            <svg
              className="w-3 h-3 text-muted-foreground"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 8l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow-lg z-50">
              {ranges.map((r) => (
                <button
                  key={r.key}
                  onClick={() => {
                    setRange(r.key);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm ${range === r.key ? "bg-primary text-primary-foreground" : "hover:bg-gray-50"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <p className="mt-3 text-sm text-muted-foreground">Cargando…</p>
      )}

      <div className="mt-4" style={{ height: `${LIST_MAX_HEIGHT}px` }}>
        <List
          height={LIST_MAX_HEIGHT}
          itemCount={displayedRanking.length}
          itemSize={ITEM_HEIGHT_RANKING}
          width="100%"
        >
          {({
            index,
            style,
          }: {
            index: number;
            style: React.CSSProperties;
          }) => {
            const l = displayedRanking[index];
            return (
              <div style={style} className="px-0">
                <div
                  onClick={() => onOpenLaw(l)}
                  className="flex items-center gap-4 rounded-lg p-3 hover:bg-white/40 transition-colors transition-shadow duration-150 cursor-pointer"
                >
                  <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cream-200 text-sm font-semibold">
                    {index + 1}
                  </span>

                  <div className="flex-1">
                    <p className="font-medium text-[0.95rem] text-left truncate">
                      {l.titulo}
                    </p>
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
      {selectedLaw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setSelectedLaw(null);
              setShowComments(false);
            }}
          />

          <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-card shadow-xl overflow-hidden">
            {/* Close X top-right */}
            <button
              onClick={() => {
                setSelectedLaw(null);
                setShowComments(false);
              }}
              aria-label="Cerrar"
              className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-muted-foreground hover:bg-white"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 6l12 12M6 18L18 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-h-[85vh]">
              <div className="lg:col-span-2 overflow-auto pr-2">
                <header className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold leading-tight">
                      {selectedLaw!.titulo}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSave?.(selectedLaw!.id)}
                      aria-label="Guardar"
                      className="rounded-full bg-white border hover:bg-gray-50 inline-flex items-center justify-center w-8 h-8"
                    >
                      <svg
                        className="w-4 h-4 text-muted-foreground transform translate-x-[1px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 2h9a2 2 0 0 1 2 2v16l-7-3-7 3V4a2 2 0 0 1 2-2z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </header>

                <section className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Objetivo
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {selectedLaw!.objetivo}
                  </p>
                </section>

                {selectedLaw!.detalles && (
                  <section className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Detalles
                    </h4>
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {selectedLaw!.detalles}
                    </p>
                  </section>
                )}

                <section>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Perspectivas
                  </h4>
                  <div className="space-y-2">
                    {Array.isArray(selectedLaw!.comentarios) &&
                    selectedLaw!.comentarios.length > 0 ? (
                      <div className="max-h-64 overflow-auto rounded-md border bg-white p-3 text-sm">
                        {selectedLaw!.comentarios.map((c: any) => (
                          <div
                            key={c.id}
                            className="py-2 border-b last:border-b-0"
                          >
                            <div className="text-sm">{c.texto}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {c.autor ?? ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Aún no hay perspectivas.
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      <input
                        ref={commentRef}
                        placeholder="Escribe tu perspectiva..."
                        className="flex-1 rounded-md border px-3 py-2 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = (
                              e.target as HTMLInputElement
                            ).value.trim();
                            if (v) {
                              onComment(selectedLaw!.id, v);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                      <button
                        className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
                        onClick={() => {
                          if (!commentRef.current) return;
                          const v = commentRef.current.value.trim();
                          if (!v) return;
                          onComment(selectedLaw!.id, v);
                          commentRef.current.value = "";
                        }}
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="lg:col-span-1 border rounded-lg p-4 h-full flex flex-col gap-4 min-h-0">
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground">
                    Autor
                  </h5>
                  <div className="mt-1 text-sm">
                    {selectedLaw!.apodo ?? "-"}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    ▲ {selectedLaw!.upvotes} votos
                  </div>
                </div>

                <div className="mt-4 flex-1 min-h-0 overflow-auto">
                  <div className="my-2 border-t border-border" />
                  <h5 className="text-sm font-medium text-muted-foreground">
                    Leyes relacionadas
                  </h5>
                  {relatedLaws.length === 0 ? (
                    <div className="text-xs text-muted-foreground mt-2">
                      No hay leyes relacionadas.
                    </div>
                  ) : (
                    <ol className="mt-2 space-y-2 text-sm">
                      {relatedLaws.map((r) => (
                        <li key={r.id}>
                          <button
                            onClick={() => {
                              setSelectedLaw(r);
                              setShowComments(false);
                            }}
                            className="text-left w-full rounded-md px-2 py-1 hover:bg-gray-50"
                          >
                            <div className="font-medium truncate">
                              {r.titulo}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

              </aside>
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
