import React, { useState, FormEvent } from "react";
import React, { useState, FormEvent } from "react";
import ReactDOM from "react-dom";
import useFirebaseAuth from "@/hooks/useFirebaseAuth";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, register, signInWithGoogle, signInAnonymous } = useFirebaseAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setBusy(true);
      if (mode === "login") await signIn(email, password);
      else await register(email, password);
      onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      setBusy(true);
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      // Friendly guidance for common misconfiguration
      const msg = err?.message || String(err);
      setError(
        (msg.includes("auth/domain-not-allowed") || msg.includes("unauthorized-domain") || msg.includes("auth/unauthorized-domain"))
          ? "Dominio no autorizado en Firebase. Añade tu dominio en la consola de Firebase (Authentication → Sign-in method → Authorized domains). Si estás probando localmente añade 'localhost' o el host que uses."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAnonymous = async () => {
    setError(null);
    try {
      setBusy(true);
      await signInAnonymous();
      onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const node = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md p-6 bg-white rounded-xl border">
        <h3 className="text-lg font-semibold mb-3">{mode === "login" ? "Iniciar sesión" : "Registrarse"}</h3>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input className="px-3 py-2 border rounded" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" className="px-3 py-2 border rounded" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={busy} className="px-4 py-2 rounded bg-primary text-white">{mode === "login" ? "Entrar" : "Crear cuenta"}</button>
            <button type="button" disabled={busy} onClick={() => setMode(mode === "login" ? "register" : "login")} className="px-3 py-2 rounded border">{mode === "login" ? "Crear cuenta" : "Ya tengo cuenta"}</button>
          </div>
        </form>

        <div className="mt-4 border-t pt-3 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleGoogle}
            className="px-3 py-2 rounded border flex items-center gap-3 justify-center"
            aria-label="Continuar con Google"
          >
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fc11605d2398a4e01a080aa84aba2263c%2F43f4b6f41852435ab6a0fd3ffcded29e?format=webp&width=800" alt="G" className="w-5 h-5" />
            <span>Continuar con Google</span>
          </button>

          <button type="button" disabled={busy} onClick={handleAnonymous} className="px-3 py-2 rounded border">
            Continuar como anónimo
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}
