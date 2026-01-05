import { useQuery } from "@tanstack/react-query";
import { obtenerStats } from "@/lib/api";

export default function StatsWidget() {
    const { data: stats } = useQuery({
        queryKey: ["stats"],
        queryFn: obtenerStats,
        staleTime: 60000,
    });

    if (!stats) return null;

    return (
        <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-card/40 backdrop-blur rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                    {stats.totalLaws}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">
                    Leyes
                </div>
            </div>
            <div className="bg-card/40 backdrop-blur rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                    {stats.totalVotes}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">
                    Votos
                </div>
            </div>
            <div className="bg-card/40 backdrop-blur rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-400">
                    {stats.totalComments}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">
                    Debates
                </div>
            </div>
        </div>
    );
}
