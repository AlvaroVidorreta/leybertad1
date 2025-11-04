import React from "react";
import { toast } from "@/hooks/use-toast";
import logger from "@/lib/logger";

type Props = { children: React.ReactNode };

export default class ErrorBoundary extends React.Component<Props, { hasError: boolean; error?: Error }>{
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // log to sink
    logger.error("Unhandled UI error", error, info);
    try {
      toast({ title: "Ha ocurrido un error", description: String(error.message || "Error inesperado" ) });
    } catch (e) {
      // swallow
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-semibold mb-2">Algo ha ido mal</h1>
            <p className="text-sm text-muted-foreground mb-4">Ha ocurrido un error en la aplicación. Intenta recargar la página.</p>
            <div className="flex items-center justify-center gap-3">
              <button
                className="px-4 py-2 rounded bg-primary text-white"
                onClick={() => location.reload()}
              >Recargar</button>
              <button
                className="px-4 py-2 rounded border"
                onClick={() => {
                  // copy error to clipboard for easy reporting
                  const text = String(this.state.error?.stack || this.state.error?.message || "");
                  try { navigator.clipboard.writeText(text); toast({ title: "Copiado", description: "Traza copiada al portapapeles" }); } catch (e) { /* ignore */ }
                }}
              >Copiar traza</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
