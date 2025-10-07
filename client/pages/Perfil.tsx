import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { obtenerRecientes } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, Edit2, MessageCircle, Bookmark, ArrowRight, ArrowLeft } from "lucide-react";

type Law = {
  id: string;
  titulo: string;
  objetivo: string;
  detalles?: string;
  apodo?: string;
  createdAt: string;
  upvotes: number;
  saves: number;
};

export default function Perfil() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    displayName: string;
    username: string;
    created: Law[];
    voted: Law[];
  } | null>(null);
  const [tab, setTab] = useState<"creaciones" | "actividad" | "guardados">("creaciones");
  const [allLaws, setAllLaws] = useState<Law[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [pRes, laws] = await Promise.all([
          fetch("/api/profile").then((r) => r.json()),
          obtenerRecientes(),
        ] as const);
        setProfile(pRes);
        setAllLaws(laws as Law[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const savedIds: string[] = (() => {
    try {
      const raw = localStorage.getItem("savedLaws");
      if (!raw) return [];
      return JSON.parse(raw) as string[];
    } catch (e) {
      return [];
    }
  })();

  const savedLaws = allLaws.filter((l) => savedIds.includes(l.id));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <div className="relative inline-block group">
          <button onClick={() => navigate(-1)} aria-label="Volver" className="flex items-center h-10 w-10 rounded-full bg-card border text-primary/80 hover:shadow-sm transition-transform duration-150 transform hover:-translate-y-0.5 focus:outline-none justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 text-sm text-primary font-medium">
            Volver
          </div>
        </div>
      </div>
      <section className="flex items-center gap-6 py-6 border-b mb-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={undefined} alt={profile?.displayName || "Usuario"} />
          <AvatarFallback>
            <span className="text-sm">U</span>
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          {(() => {
            const registered = profile && !profile.displayName?.startsWith("Usuario ");
            return (
              <>
                <h2 className="font-brand text-2xl text-primary">{registered ? profile!.displayName : "Usuario no registrado"}</h2>
                <div className="text-sm text-muted-foreground">{registered ? profile!.username : "Usuario no registrado"}</div>
              </>
            );
          })()}
          <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
            <div>Propuestas creadas: <span className="text-foreground font-semibold">{profile ? profile.created.length : 0}</span></div>
            <div>Votos emitidos: <span className="text-foreground font-semibold">{profile ? profile.voted.length : 0}</span></div>
          </div>
        </div>

        <div>
          <Link to="/perfil/editar">
            <Button variant="link" size="sm" className="text-sm"><Edit2 size={14} className="mr-2"/>Editar Perfil</Button>
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
        <button onClick={() => setTab("creaciones")} role="tab" aria-selected={tab==="creaciones"} className={`px-4 py-2 rounded-md font-brand text-sm transition ${tab === "creaciones" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "text-muted-foreground"}`}>Creaciones</button>
        <button onClick={() => setTab("actividad")} role="tab" aria-selected={tab==="actividad"} className={`px-4 py-2 rounded-md font-brand text-sm transition ${tab === "actividad" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "text-muted-foreground"}`}>Actividad</button>
        <button onClick={() => setTab("guardados")} role="tab" aria-selected={tab==="guardados"} className={`px-4 py-2 rounded-md font-brand text-sm transition ${tab === "guardados" ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "text-muted-foreground"}`}>Guardados</button>
      </nav>

      {tab === "creaciones" && (
        <section className="mb-8">
          <h3 className="font-brand text-lg mb-4">Propuestas Creadas</h3>
          <div className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Cargando…</div>}
            {!loading && profile && profile.created.length === 0 && <div className="text-sm text-muted-foreground">No has creado propuestas todavía.</div>}
            {!loading && profile && profile.created.slice(0,5).map((law) => (
              <a key={law.id} href={`/laws/${law.id}`} className="block border rounded-md p-3 hover:shadow-sm flex justify-between items-start">
                <div>
                  <div className="font-semibold">{law.titulo}</div>
                  <div className="text-sm text-muted-foreground truncate">{law.objetivo}</div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="font-semibold">▲ {law.upvotes}</span>
                </div>
              </a>
            ))}
            {!loading && profile && profile.created.length > 5 && (
              <div className="mt-3 text-right">
                <Link to="/perfil/creaciones" className="text-sm text-primary underline">Ver todas</Link>
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
                {profile.voted.slice(0,8).map((l) => (
                  <div key={`v-${l.id}`} className="flex items-center gap-3">
                    <CheckCircle className="text-muted-foreground" />
                    <div>Ha votado a favor de <a href={`/laws/${l.id}`} className="font-semibold text-foreground">{l.titulo}</a>.</div>
                  </div>
                ))}
                {profile.created.slice(0,8).map((l) => (
                  <div key={`c-${l.id}`} className="flex items-center gap-3">
                    <BookOpen className="text-muted-foreground" />
                    <div>Ha propuesto la ley <a href={`/laws/${l.id}`} className="font-semibold text-foreground">{l.titulo}</a>.</div>
                  </div>
                ))}
                {profile.voted.length === 0 && profile.created.length === 0 && <div className="text-sm text-muted-foreground">No hay actividad reciente.</div>}
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
              <a key={law.id} href={`/laws/${law.id}`} className="block border rounded-md p-3 hover:shadow-sm flex justify-between items-start">
                <div>
                  <div className="font-semibold">{law.titulo}</div>
                  <div className="text-sm text-muted-foreground truncate">{law.objetivo}</div>
                </div>
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
