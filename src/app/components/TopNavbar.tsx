import React from 'react';
import { Building2, LayoutDashboard, Building, Users, Wrench, Bell, Info, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

interface TopNavbarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function TopNavbar({ activeView, onViewChange }: TopNavbarProps) {
  const { user, logout } = useAuth();

  const adminMenuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'buildings', label: 'Bâtiments', icon: Building },
    { id: 'tenants', label: 'Locataires', icon: Users },
    { id: 'requests', label: 'Demandes', icon: Wrench },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'info', label: 'Informations', icon: Info },
  ];

  const tenantMenuItems = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'requests', label: 'Mes demandes', icon: Wrench },
    { id: 'info', label: 'Informations', icon: Info },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : tenantMenuItems;

  return (
    <div className="bg-card border-b border-border">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo et Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-medium text-foreground">Immostore</h1>
              <p className="text-xs text-muted-foreground">
                {user?.role === 'admin' ? 'Administrateur' : 'Locataire'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm
                    ${
                      isActive
                        ? 'bg-secondary text-white'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info et Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              onClick={logout}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
