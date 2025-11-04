import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { obtenerRecientes } from "@/lib/api";

export default function PerfilEditar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const p = await fetch("/api/profile").then((r) => r.json());
        if (!mounted) return;
        setProfile(p);
        // load overrides
        const visitor = localStorage.getItem("visitorId") || "unknown";
        const raw = localStorage.getItem(`profile_override:${visitor}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setDisplayName(parsed.displayName || p.displayName || "");
            setUsername(parsed.username || p.username || "");
          } catch (e) {
            setDisplayName(p.displayName || "");
            setUsername(p.username || "");
          }
        } else {
          setDisplayName(p.displayName || "");
          setUsername(p.username || "");
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const save = () => {
    const visitor = localStorage.getItem("visitorId") || "unknown";
    const payload = { displayName: displayName.trim(), username: username.trim() };
    localStorage.setItem(`profile_override:${visitor}`, JSON.stringify(payload));
    toast({ title: "Perfil guardado", description: "Tus cambios se han guardado localmente." });
    navigate("/perfil");
  };

  const clear = () => {
    const visitor = localStorage.getItem("visitorId") || "unknown";
    localStorage.removeItem(`profile_override:${visitor}`);
    toast({ title: "Restaurado", description: "Nombre de usuario restaurado al valor por defecto." });
    navigate("/perfil");
  };

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h2 className="text-2xl font-semibold mb-4">Editar perfil</h2>
      {loading && <div className="text-sm text-muted-foreground">Cargando…</div>}
      {!loading && profile && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nombre de usuario (visible público)</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Datos públicos</h3>
            <div className="text-sm text-muted-foreground">Propuestas creadas: {profile.created.length}</div>
            <div className="text-sm text-muted-foreground">Votos emitidos: {profile.voted.length}</div>
          </div>

          <div className="flex gap-3">
            <Button onClick={save}>Guardar</Button>
            <Button variant="outline" onClick={clear}>Restaurar valores</Button>
            <Button variant="link" onClick={() => navigate(-1)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
