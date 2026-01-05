import { useState, useEffect, useCallback } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";

import { Law, CommentInput } from "@shared/api";
import { comentarLey } from "@/lib/api";
import useFirebaseAuth from "@/hooks/useFirebaseAuth";

import AuthModal from "@/components/AuthModal";
import NavBar from "@/components/NavBar";

// Feature Components
import CreateLawHero from "@/features/laws/components/CreateLawHero";
import LawFeed from "@/features/laws/components/LawFeed";
import LawDetailModal from "@/features/laws/components/LawDetailModal";
import RankingWidget from "@/features/ranking/components/RankingWidget";
import StatsWidget from "@/features/stats/components/StatsWidget";
import LibraryExplorer from "@/features/library/components/LibraryExplorer";

export default function Index() {
  const [selectedLaw, setSelectedLaw] = useState<Law | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useFirebaseAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Listen for global auth events
  useEffect(() => {
    function onAuth() {
      setAuthOpen(true);
    }
    window.addEventListener("open-auth", onAuth);
    return () => window.removeEventListener("open-auth", onAuth);
  }, []);

  const handleOpenLaw = useCallback((law: Law, openComments = false) => {
    setSelectedLaw(law);
    // Note: openComments logic handled by passing prop to modal/scrolling if needed,
    // but here we just open the modal with the law.
    // Ideally we'd pass 'initialFocus: comments' to the modal.
    if (openComments) {
      // Logic could be added here or in the modal to focus comments
    }
  }, []);

  const comentar = useMutation({
    mutationFn: ({ id, texto }: { id: string; texto: CommentInput }) =>
      comentarLey(id, texto),
    onSuccess: (updatedLaw) => {
      // update cache
      if (selectedLaw && selectedLaw.id === updatedLaw.id) {
        setSelectedLaw(updatedLaw);
      }
      qc.invalidateQueries({ queryKey: ["recientes"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
      toast.success("Perspectiva añadida");
    },
    onError: () => {
      toast.error("Error al comentar");
    },
  });

  const handleComment = useCallback(
    (id: string, texto: string) => {
      comentar.mutate({ id, texto: { texto } });
    },
    [comentar],
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/10">
      <Toaster position="bottom-right" />
      <NavBar
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        onProfileClick={() => navigate("/perfil")}
      />

      {/* Hero Section */}
      <header className="relative z-10 -mt-px border-b bg-gradient-to-b from-background via-background/50 to-background/20 pt-6 pb-12">
        <CreateLawHero />
      </header>

      {/* Decorative gradient separator */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN: Feed (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-8 min-w-0">
            <LawFeed onOpenLaw={handleOpenLaw} onComment={handleComment} />
          </div>

          {/* RIGHT COLUMN: Widgets (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-8 sticky top-24 min-w-0">
            <StatsWidget />

            {/* Library Widget (Flip Card) */}
            <div className="h-[420px]">
              <LibraryExplorer />
            </div>

            <RankingWidget onOpenLaw={handleOpenLaw} />
          </div>
        </div>
      </main>

      {/* Modals */}
      {selectedLaw && (
        <LawDetailModal
          selectedLaw={selectedLaw}
          onClose={() => setSelectedLaw(null)}
          onComment={handleComment}
          onOpenLaw={handleOpenLaw}
        />
      )}

      {authOpen && <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
