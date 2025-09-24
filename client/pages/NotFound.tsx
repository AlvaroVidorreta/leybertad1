import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <AppLayout>
      <div className="py-24 text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Página no encontrada</p>
        <a href="/" className="underline">
          Volver al inicio
        </a>
      </div>
    </AppLayout>
  );
};

export default NotFound;
