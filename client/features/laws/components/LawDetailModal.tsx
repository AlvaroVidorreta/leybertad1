import { useRef, useEffect } from "react";
import { Law } from "@shared/api";
import useFirebaseAuth from "@/hooks/useFirebaseAuth";
import { useQueryClient } from "@tanstack/react-query";

export default function LawDetailModal({
    selectedLaw,
    onClose,
    onComment,
    onSave,
    onOpenLaw,
}: {
    selectedLaw: Law;
    onClose: () => void;
    onComment: (id: string, texto: string) => void;
    onSave?: (id: string) => void;
    onOpenLaw: (law: Law) => void;
}) {
    const commentRef = useRef<HTMLInputElement | null>(null);
    const { user: currentUser } = useFirebaseAuth();
    const qc = useQueryClient();

    const relatedLaws = (() => {
        const all = qc.getQueryData<Law[]>(["recientes"]) || [];
        const others = all.filter((l) => l.id !== selectedLaw.id);
        const selCat = (selectedLaw as any).category;
        const selSub = (selectedLaw as any).subcategory;

        if (!selCat && !selSub) return [] as Law[];

        const same = others.filter((l) => {
            const lcat = (l as any).category;
            const lsub = (l as any).subcategory;
            return (
                (selCat && lcat && lcat === selCat) ||
                (selSub && lsub && lsub === selSub)
            );
        });
        return same.slice(0, 5);
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />

            <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-card shadow-xl overflow-hidden">
                <button
                    onClick={onClose}
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
                                    {selectedLaw.titulo}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onSave?.(selectedLaw.id)}
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
                                {selectedLaw.objetivo}
                            </p>
                        </section>

                        {selectedLaw.detalles && (
                            <section className="mb-4">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                    Detalles
                                </h4>
                                <p className="text-sm leading-relaxed whitespace-pre-line">
                                    {selectedLaw.detalles}
                                </p>
                            </section>
                        )}

                        <section>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                Perspectivas
                            </h4>
                            <div className="space-y-2">
                                {Array.isArray(selectedLaw.comentarios) &&
                                    selectedLaw.comentarios.length > 0 ? (
                                    <div className="max-h-64 overflow-auto rounded-md border bg-white p-3 text-sm">
                                        {selectedLaw.comentarios.map((c: any) => (
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
                                    {currentUser ? (
                                        <>
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
                                                            onComment(selectedLaw.id, v);
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
                                                    onComment(selectedLaw.id, v);
                                                    commentRef.current.value = "";
                                                }}
                                            >
                                                Enviar
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                readOnly
                                                placeholder="Necesario Iniciar Sesión"
                                                className="flex-1 rounded-md border px-3 py-2 text-sm text-muted-foreground cursor-pointer"
                                                onFocus={() =>
                                                    window.dispatchEvent(new CustomEvent("open-auth"))
                                                }
                                                onClick={() =>
                                                    window.dispatchEvent(new CustomEvent("open-auth"))
                                                }
                                            />
                                            <button
                                                className="px-4 py-2 rounded-md border bg-white"
                                                onClick={() =>
                                                    window.dispatchEvent(new CustomEvent("open-auth"))
                                                }
                                            >
                                                Iniciar sesión
                                            </button>
                                        </>
                                    )}
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
                                {selectedLaw.apodo ?? "-"}
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                                ▲ {selectedLaw.upvotes} votos
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
                                                    onOpenLaw(r);
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
    );
}
