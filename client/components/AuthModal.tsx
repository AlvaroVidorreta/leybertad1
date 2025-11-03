import { useState, FormEvent } from "react";
import { useState, FormEvent } from "react";
import useFirebaseAuth from "@/hooks/useFirebaseAuth";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, register, signInWithGoogle, signInAnonymous } = useFirebaseAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "login") await signIn(email, password);
      else await register(email, password);
      onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md p-6 bg-white rounded-xl border">
        <h3 className="text-lg font-semibold mb-3">{mode === "login" ? "Iniciar sesión" : "Registrarse"}</h3>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input className="px-3 py-2 border rounded" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" className="px-3 py-2 border rounded" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center gap-2">
            <button type="submit" className="px-4 py-2 rounded bg-primary text-white">{mode === "login" ? "Entrar" : "Crear cuenta"}</button>
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="px-3 py-2 rounded border">{mode === "login" ? "Crear cuenta" : "Ya tengo cuenta"}</button>
          </div>
        </form>

        <div className="mt-4 border-t pt-3 flex flex-col gap-2">
          <button onClick={async () => { await signInWithGoogle(); onClose(); }} className="px-3 py-2 rounded border">Continuar con Google</button>
          <button onClick={async () => { await signInAnonymous(); onClose(); }} className="px-3 py-2 rounded border">Entrar como anónimo</button>
        </div>
      </div>
    </div>
  );
}
