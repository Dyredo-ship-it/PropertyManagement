// DashboardSidebar.tsx
import React from "react";
import {
  Building2,
  Home,
  Users,
  Bell,
  Wrench,
  LogOut,
  LayoutDashboard,
  User,
  Info,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

interface DashboardSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function DashboardSidebar({
  activeView,
  onViewChange,
}: DashboardSidebarProps) {
  const { user, logout } = useAuth();

  const adminMenuItems = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "buildings", label: "Bâtiments", icon: Building2 },
    { id: "tenants", label: "Locataires", icon: Users },
    { id: "requests", label: "Demandes", icon: Wrench },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "informations", label: "Informations", icon: Info }, // ✅ match your ViewId
  ];

  const tenantMenuItems = [
    { id: "dashboard", label: "Accueil", icon: Home },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "requests", label: "Mes demandes", icon: Wrench },
    { id: "profile", label: "Mon profil", icon: User }, // if you don't have it, remove it
    { id: "informations", label: "Informations", icon: Info }, // ✅ match your ViewId
  ];

  const menuItems = user?.role === "admin" ? adminMenuItems : tenantMenuItems;

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-white/10 bg-black/60 backdrop-blur-xl">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white/90" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl text-white/95 leading-tight">Immostore</h1>
            <p className="text-xs text-white/60">
              {user?.role === "admin" ? "Administrateur" : "Locataire"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={[
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                "border border-transparent",
                isActive
                  ? "bg-white/10 border-white/12 text-white"
                  : "text-white/75 hover:bg-white/6 hover:text-white/90",
              ].join(" ")}
            >
              <Icon className={isActive ? "w-5 h-5 text-white" : "w-5 h-5 text-white/70"} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="px-4 py-3 mb-3 rounded-2xl border border-white/10 bg-white/5">
          <p className="text-xs text-white/60">Connecté en tant que</p>
          <p className="text-sm text-white/90 truncate mt-1">{user?.name}</p>
          <p className="text-xs text-white/60 truncate">{user?.email}</p>
        </div>

        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start rounded-xl text-white/80 hover:bg-white/6 hover:text-white"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
