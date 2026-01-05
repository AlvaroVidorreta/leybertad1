import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, FileText, AlertTriangle } from "lucide-react";

interface Bill {
    id: string;
    title: string;
    summary?: string;
    date: string;
    pdfUrl?: string;
    boeUrl?: string;
    _count?: {
        notes: number;
    }
}

const fetchBills = async (): Promise<Bill[]> => {
    const res = await fetch("/api/boe");
    if (!res.ok) throw new Error("Failed to fetch bills");
    return res.json();
};

const triggerSync = async () => {
    const res = await fetch("/api/boe/sync", { method: "POST" });
    if (!res.ok) throw new Error("Sync failed");
    return res.json();
};

export default function VigilanciaPage() {
    const { data: bills, isLoading, refetch } = useQuery({
        queryKey: ["boe-bills"],
        queryFn: fetchBills,
    });

    const handleSync = async () => {
        try {
            await triggerSync();
            refetch();
        } catch (e) {
            alert("Error syncing BOE");
        }
    };

    if (isLoading) return <div className="p-8 text-center">Cargando vigilancia legislativa...</div>;

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <AlertTriangle className="text-yellow-500" />
                        Vigilancia Legislativa
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Monitorización diaria del Boletín Oficial del Estado (BOE).
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSync}>
                        🔄 Sincronizar Hoy
                    </Button>
                    <div className="bg-red-100 text-red-800 px-4 py-2 rounded-md font-bold text-sm border border-red-200">
                        Tsunami Regulatorio: {bills?.length || 0} nuevas normas
                    </div>
                </div>
            </div>

            <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="grid gap-4">
                    {bills?.length === 0 && (
                        <div className="text-center py-20 text-gray-500">
                            No hay datos. Pulsa "Sincronizar" para descargar el BOE de hoy.
                        </div>
                    )}
                    {bills?.map((bill) => (
                        <Card key={bill.id} className="hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-4">
                                    <CardTitle className="text-lg leading-snug">
                                        {bill.title}
                                    </CardTitle>
                                    <Badge variant="secondary" className="shrink-0">
                                        {new Date(bill.date).toLocaleDateString()}
                                    </Badge>
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {bill.id}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex gap-2">
                                        {bill.pdfUrl && (
                                            <a href={bill.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="sm" className="h-8 gap-1">
                                                    <FileText className="w-4 h-4" /> PDF
                                                </Button>
                                            </a>
                                        )}
                                        {bill.boeUrl && (
                                            <a href={bill.boeUrl} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="sm" className="h-8 gap-1">
                                                    <ExternalLink className="w-4 h-4" /> Web
                                                </Button>
                                            </a>
                                        )}
                                    </div>

                                    <Button variant="secondary" size="sm">
                                        📝 Anotar {bill._count?.notes ? `(${bill._count.notes})` : ""}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
