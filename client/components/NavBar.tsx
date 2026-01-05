import { User } from "firebase/auth";
import { Link } from "react-router-dom";

export default function NavBar({
    user,
    onOpenAuth,
    onProfileClick,
}: {
    user: User | null;
    onOpenAuth: () => void;
    onProfileClick: () => void;
}) {
    return (
        <nav className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="relative w-8 h-8 overflow-hidden rounded-lg">
                            <img
                                src="/logo_nb.png"
                                alt="Leybertad Logo"
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                            />
                        </div>
                        <span className="font-brand text-xl tracking-tight hidden sm:block group-hover:text-primary transition-colors">
                            Leybertad
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-6">
                    <Link to="/vigilancia" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                        🟡 Vigilancia
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    {user ? (
                        <button
                            onClick={onProfileClick}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card hover:bg-accent transition-all duration-200 group"
                        >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">
                                {user.email?.split("@")[0]}
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={onOpenAuth}
                            className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                        >
                            Iniciar Sesión
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
