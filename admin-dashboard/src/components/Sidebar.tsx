import { useState, ComponentType } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, 
  Church, 
  Megaphone, 
  MessageSquare, 
  FileBarChart, 
  Settings, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type NavItem = { title: string; url: string; icon: ComponentType<{ className?: string }> };

const getNavigationItems = (role?: string): NavItem[] => {
  if (role === 'parish_secretary') {
    return [
      { title: 'Dashboard Overview', url: '/parish', icon: Home },
      { title: 'Manage Churches', url: '/parish#churches', icon: Church },
      { title: 'Manage Announcements', url: '/parish#announcements', icon: Megaphone },
      { title: 'Feedback Reports', url: '/parish#feedback', icon: MessageSquare },
      { title: 'Account Settings', url: '/parish#settings', icon: Settings },
    ];
  }
  // default (chancery/researcher): previous full list
  return [
    { title: 'Dashboard Overview', url: '/', icon: Home },
    { title: 'Manage Churches', url: '/churches', icon: Church },
    { title: 'Manage Announcements', url: '/announcements', icon: Megaphone },
    { title: 'Feedback Reports', url: '/feedback', icon: MessageSquare },
    { title: 'Generate Reports', url: '/reports', icon: FileBarChart },
    { title: 'Account Settings', url: '/settings', icon: Settings },
  ];
};

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userProfile } = useAuth();

  const isActive = (path: string) => {
    // Treat hash links as active based on base path
    const base = path.split('#')[0];
    return location.pathname === base;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div 
      className={cn(
        "bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Church className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sidebar-foreground font-bold text-sm leading-tight">
                {userProfile?.role === 'chancery_office' && 'Chancery Office'}
                {userProfile?.role === 'museum_researcher' && 'Heritage Research'}
                {userProfile?.role === 'parish_secretary' && 'Parish Secretary'}
              </h1>
              <p className="text-sidebar-foreground/70 text-xs">
                VISITA Dashboard {userProfile?.diocese && `• ${userProfile.diocese}`}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors duration-150 text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {getNavigationItems(userProfile?.role).map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={cn(
              "sidebar-nav-item",
              isActive(item.url) && "active"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-medium text-sm">{item.title}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <button 
          onClick={handleLogout}
          className="sidebar-nav-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );
}