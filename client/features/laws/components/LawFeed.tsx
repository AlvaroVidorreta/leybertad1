import React, { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { obtenerRecientes, votarLey, guardarLey } from "@/lib/api";
import { Law } from "@shared/api";
import { LawCard } from "./LawCard";

const ITEM_HEIGHT_RANKING = 64;
const MAX_RANKING_ITEMS = 5;
const LIST_MAX_HEIGHT = ITEM_HEIGHT_RANKING * MAX_RANKING_ITEMS;

export default function LawFeed({
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

    const handleUpvote = useCallback((id: string) => votar.mutate(id), [votar]);
    const handleSave = useCallback((id: string) => guardar.mutate(id), [guardar]);

    const ITEM_SIZE_RECENT = 104;

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
            <h3 className="text-xl font-brand mb-4">Más recientes</h3>
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
