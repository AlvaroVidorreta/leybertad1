import React, { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logger from "@/lib/logger";
import LawSummary from "@/components/LawSummary";
import { Button } from "@/components/ui/button";
import { obtenerRecientes } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, Edit2, Bookmark, ArrowLeft } from "lucide-react";
import type { ProfileResponse, Law as SharedLaw } from "@shared/api";

type Law = SharedLaw;

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute top-6 left-4 md:-left-36 z-10">
      <div className="group relative inline-block">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="group relative inline-flex items-center justify-center h-10 w-10 rounded-full bg-card border text-primary/80 hover:shadow-sm transition-all duration-200 transform focus:outline-none overflow-hidden md:group-hover:w-20 md:group-hover:px-2"
        >
          <span className="arrow absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200 group-hover:-translate-x-8 group-hover:opacity-0">
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span className="hidden md:inline-block opacity-0 transition-opacity duration-200 text-sm font-medium text-primary group-hover:opacity-100">
            Volver
          </span>
        </button>
      </div>
    </div>
  );
}

export default function Perfil() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [tab, setTab] = useState<"creaciones" | "actividad" | "guardados">("creaciones");
  const [allLaws, setAllLaws] = useState<Law[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [pRes, laws] = await Promise.all([fetch("/api/profile").then((r) => r.json()), obtenerRecientes()]);
        if (!mounted) return;
        // apply local overrides (saved in localStorage) to profile so editing persists client-side
        try {
          const visitor = localStorage.getItem('visitorId') || 'unknown';
          const raw = localStorage.getItem(`profile_override:${visitor}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            const merged = { ...(pRes as ProfileResponse), displayName: parsed.displayName || (pRes as ProfileResponse).displayName, username: parsed.username || (pRes as ProfileResponse).username } as ProfileResponse;
            setProfile(merged);
          } else {
            setProfile(pRes as ProfileResponse);
          }
        } catch (e) {
          setProfile(pRes as ProfileResponse);
        }
        setAllLaws(laws as Law[]);
      } catch (err) {
        logger.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const savedIds = useMemo(() => {
    try {
      const raw = localStorage.getItem("savedLaws");
      if (!raw) return [] as string[];
      return JSON.parse(raw) as string[];
    } catch (e) {
      return [] as string[];
    }
  }, []);

  const savedLaws = useMemo(() => allLaws.filter((l) => savedIds.includes(l.id)), [allLaws, savedIds]);

  const registered = useMemo(() => !!profile && !profile.displayName?.startsWith("Usuario "), [profile]);

  return (
    <div className="max-w-4xl mx-auto relative">
      <BackButton onBack={() => navigate('/')} />

      <section className="flex items-center gap-6 py-6 border-b mb-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={undefined} alt={profile?.displayName || "Usuario"} />
          <AvatarFallback>
            <span className="text-sm">U</span>
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h2 className="font-brand text-2xl text-primary">{registered ? profile!.displayName : "Usuario no registrado"}</h2>
          <div className="text-sm text-muted-foreground">{registered ? profile!.username : "Usuario no registrado"}</div>

          <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
            <div>
              Propuestas creadas: <span className="text-foreground font-semibold">{profile ? profile.created.length : 0}</span>
            </div>
            <div>
              Votos emitidos: <span className="text-foreground font-semibold">{profile ? profile.voted.length : 0}</span>
            </div>
          </div>
        </div>

        <div>
          <Link to="/perfil/editar">
            <Button variant="link" size="sm" className="text-sm">
              <Edit2 size={14} className="mr-2" />Editar Perfil
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-6 border-b mb-6 text-center">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">BRÚJULA IDEOLÓGICA</h3>
        <div className="mt-4">
          <div className="relative h-3 bg-muted rounded-full mx-auto w-full max-w-2xl">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
              <div className="h-4 w-4 rounded-full bg-primary border-2 border-card" />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-sm text-muted-foreground max-w-2xl mx-auto">
            <span>Colectivismo / Intervencionismo</span>
            <span>Individualismo / Liberalismo</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Calculado en base a las propuestas de ley que has apoyado.</p>
        </div>
      </section>

      <nav className="flex items-center gap-3 mb-6" role="tablist" aria-label="Perfil tabs">
        <button
          onClick={() => setTab("creaciones")}
          role="tab"
          aria-selected={tab === "creaciones"}
          className={`px-4 py-2 rounded-md font-brand text-sm transition ${
            tab === "creaciones" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "text-muted-foreground"
          }`}
        >
          Creaciones
        </button>

        <button
          onClick={() => setTab("actividad")}
          role="tab"
          aria-selected={tab === "actividad"}
          className={`px-4 py-2 rounded-md font-brand text-sm transition ${
            tab === "actividad" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "text-muted-foreground"
          }`}
        >
          Actividad
        </button>

        <button
          onClick={() => setTab("guardados")}
          role="tab"
          aria-selected={tab === "guardados"}
          className={`px-4 py-2 rounded-md font-brand text-sm transition ${
            tab === "guardados" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "text-muted-foreground"
          }`}
        >
          Guardados
        </button>
      </nav>

      {tab === "creaciones" && (
        <section className="mb-8">
          <h3 className="font-brand text-lg mb-4">Propuestas Creadas</h3>
          <div className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Cargando…</div>}
            {!loading && profile && profile.created.length === 0 && (
              <div className="text-sm text-muted-foreground">No has creado propuestas todavía.</div>
            )}

            {!loading && profile &&
              profile.created.slice(0, 5).map((law) => (
                <a key={law.id} href={`/laws/${law.id}`} className="block border rounded-md p-3 hover:shadow-sm flex justify-between items-center">
                    <LawSummary title={law.titulo} objetivo={law.objetivo} className="max-w-[calc(100%-5rem)]" titleClassName="font-semibold" />
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="font-semibold">▲ {law.upvotes}</span>
                  </div>
                </a>
              ))}

            {!loading && profile && profile.created.length > 5 && (
              <div className="mt-3 text-right">
                <Link to="/perfil/creaciones" className="text-sm text-primary underline">
                  Ver todas
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "actividad" && (
        <section className="mb-8">
          <h3 className="font-brand text-lg mb-4">Actividad Reciente</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            {loading && <div>Cargando…</div>}
            {!loading && profile && (
              <div className="space-y-2">
                {profile.voted.slice(0, 8).map((l) => (
                  <div key={`v-${l.id}`} className="flex items-center gap-3">
                    <CheckCircle className="text-muted-foreground" />
                    <div>
                      Ha votado a favor de <a href={`/laws/${l.id}`} className="font-semibold text-foreground">{l.titulo}</a>.
                    </div>
                  </div>
                ))}

                {profile.created.slice(0, 8).map((l) => (
                  <div key={`c-${l.id}`} className="flex items-center gap-3">
                    <BookOpen className="text-muted-foreground" />
                    <div>
                      Ha propuesto la ley <a href={`/laws/${l.id}`} className="font-semibold text-foreground">{l.titulo}</a>.
                    </div>
                  </div>
                ))}

                {profile.voted.length === 0 && profile.created.length === 0 && (
                  <div className="text-sm text-muted-foreground">No hay actividad reciente.</div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "guardados" && (
        <section className="mb-8">
          <h3 className="font-brand text-lg mb-4">Leyes Guardadas</h3>
          <div className="space-y-3">
            {savedLaws.length === 0 && <div className="text-sm text-muted-foreground">No tienes leyes guardadas.</div>}

            {savedLaws.map((law) => (
              <a key={law.id} href={`/laws/${law.id}`} className="block border rounded-md p-3 hover:shadow-sm flex justify-between items-center">
                  <LawSummary title={law.titulo} objetivo={law.objetivo} className="max-w-[calc(100%-5rem)]" titleClassName="font-semibold" />
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Bookmark />
                  <span className="font-semibold">▲ {law.upvotes}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
