import { memo } from "react";
import { Law } from "@shared/api";
import LawSummary from "@/components/LawSummary";

export const LawCard = memo(function LawCard({
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
