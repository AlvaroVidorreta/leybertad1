import { useState, useRef, useEffect, Suspense, lazy } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { crearLey } from "@/lib/api";
import { Law } from "@shared/api";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";

const QuoteRotator = lazy(() => import("@/components/QuoteRotator"));

export default function CreateLawHero() {
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
        return () => { };
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
                        className={`transition-all duration-500 ${expand ? "max-h-[400px] opacity-100 mt-4" : "max-h-0 opacity-0 pointer-events-none"}`}
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
