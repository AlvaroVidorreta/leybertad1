import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { obtenerRanking } from "@/lib/api";
import { Law, TimeRange } from "@shared/api";

const ITEM_HEIGHT_RANKING = 64;
const MAX_RANKING_ITEMS = 5;
const LIST_MAX_HEIGHT = ITEM_HEIGHT_RANKING * MAX_RANKING_ITEMS;

export default function RankingWidget({
    onOpenLaw,
}: {
    onOpenLaw: (law: Law, openComments?: boolean) => void;
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
                <h3 className="text-xl font-brand">Ranking</h3>
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
        </div>
    );
}
