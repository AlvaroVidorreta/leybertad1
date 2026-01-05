import { useState } from "react";
import HorizontalCarousel from "@/components/HorizontalCarousel";
import AnalizadorPropuestas from "@/components/AnalizadorPropuestas";
import BibliotecaSub from "@/pages/BibliotecaSub";
import { CATEGORIES } from "@/lib/categories";

export default function LibraryExplorer() {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showSub, setShowSub] = useState<string | null>(null);

    // If a specific sub-library is selected, show it full-width
    if (showSub) {
        return (
            <div className="h-full">
                <BibliotecaSub categoryProp={showSub} onClose={() => setShowSub(null)} />
            </div>
        );
    }

    return (
        <div className="h-full perspective-1000">
            <div
                className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}
            >
                {/* FRONT: Categories + Carousel */}
                <div className="absolute inset-0 backface-hidden flex flex-col">
                    <div className="flex-1 bg-card rounded-2xl border p-6 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="text-xl font-brand">Biblioteca</h3>
                            <button
                                onClick={() => setIsFlipped(true)}
                                className="text-xs px-3 py-1 rounded-full border bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                Analizador
                                <svg
                                    className="w-3 h-3 text-muted-foreground"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col justify-center">
                            <HorizontalCarousel
                                items={CATEGORIES}
                                onSelectSub={(catTitle, subTitle) => setShowSub(catTitle)}
                            />
                        </div>
                    </div>
                </div>

                {/* BACK: Analizador */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col">
                    <div className="flex-1 bg-brown-900 rounded-2xl border border-brown-700 p-6 flex flex-col min-h-0 relative overflow-hidden">
                        {/* Background texture/gradient for 'Premium' feel */}
                        <div className="absolute inset-0 bg-gradient-to-br from-brown-900 via-brown-800 to-brown-900 opacity-90 pointer-events-none" />

                        <div className="relative z-10 flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="text-xl font-brand text-brown-50">
                                Analizador IA
                            </h3>
                            <button
                                onClick={() => setIsFlipped(false)}
                                className="text-xs px-3 py-1 rounded-full border border-brown-600 bg-brown-800 text-brown-100 hover:bg-brown-700 transition-colors flex items-center gap-2"
                            >
                                <svg
                                    className="w-3 h-3 text-brown-300 transform rotate-180"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                                    />
                                </svg>
                                Biblioteca
                            </button>
                        </div>

                        <div className="relative z-10 flex-1 min-h-0 flex flex-col">
                            <AnalizadorPropuestas />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
