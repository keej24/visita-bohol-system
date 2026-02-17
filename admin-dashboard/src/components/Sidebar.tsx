/**
 * =============================================================================
 * SIDEBAR.TSX - Navigation Sidebar Component
 * =============================================================================
 *
 * PURPOSE:
 * This component renders the left sidebar with navigation links. The links
 * shown depend on the user's role - each role sees different menu items.
 *
 * ROLE-BASED NAVIGATION:
 * ┌─────────────────────────┬─────────────────────────────────────────────────┐
 * │ Role                    │ Menu Items                                      │
 * ├─────────────────────────┼─────────────────────────────────────────────────┤
 * │ parish                  │ Church Profile, Announcements*, Feedback*,     │
 * │                         │ Reports*, Account (*requires church approval)  │
 * │                         │                                                 │
 * │ chancery_office         │ Dashboard, Churches, Users, Announcements,     │
 * │                         │ Feedback, Reports, Settings                    │
 * │                         │                                                 │
 * │ museum_researcher       │ Dashboard, Approved Churches, Settings         │
 * └─────────────────────────┴─────────────────────────────────────────────────┘
 *
 * KEY FEATURES:
 * 1. Collapsible sidebar (toggle width 64px ↔ 256px)
 * 2. Role-based menu items (getNavigationItems function)
 * 3. Active state highlighting (NavLink or tab matching)
 * 4. Disabled items for unapproved parish secretaries
 * 5. User profile display with avatar
 * 6. Role-specific styling (different colors per role)
 * 7. Tooltips when sidebar is collapsed
 *
 * PARISH SECRETARY TAB SYSTEM:
 * - Parish secretaries have a single-page dashboard with tabs
 * - Sidebar items are "tabs" not separate pages
 * - Clicking an item sets activeTab state instead of navigating
 * - Some tabs are disabled until church is approved
 *
 * WHY DISABLED ITEMS FOR PARISH?
 * - New parish secretaries must first complete their church profile
 * - Until approved by Chancery, they can only see/edit the profile
 * - After approval: Announcements, Feedback, Reports become available
 *
 * RELATED FILES:
 * - Layout.tsx: Parent component that includes Sidebar + Header
 * - Header.tsx: Top header component (same props pattern)
 * - pages/ParishDashboard.tsx: Uses activeTab/setActiveTab props
 * - contexts/AuthContext.tsx: Provides userProfile for role checking
 */

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
  X,
  Upload,
  Bell,
  User,
  Building,
  Crown,
  Landmark,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Users,
} from "lucide-react";
import { cn, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string | number;
  onClick?: () => void;
  isTab?: boolean;
  requiresApproval?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

const getNavigationItems = (role?: string, setActiveTab?: (tab: string) => void, churchApproved?: boolean): NavItem[] => {
  if (role === 'parish') {
    return [
      { title: 'Church Profile', url: '/parish', icon: Church, onClick: () => setActiveTab?.('overview'), isTab: true },
      {
        title: 'Announcements',
        url: '/parish',
        icon: Bell,
        onClick: () => setActiveTab?.('announcements'),
        isTab: true,
        requiresApproval: true,
        disabled: !churchApproved,
        disabledReason: 'Available after church profile approval'
      },
      {
        title: 'Visitor Feedback',
        url: '/parish',
        icon: MessageSquare,
        onClick: () => setActiveTab?.('feedback'),
        isTab: true,
        requiresApproval: true,
        disabled: !churchApproved,
        disabledReason: 'Available after church profile approval'
      },
      {
        title: 'Generate Reports',
        url: '/parish',
        icon: FileBarChart,
        onClick: () => setActiveTab?.('reports'),
        isTab: true,
        requiresApproval: true,
        disabled: !churchApproved,
        disabledReason: 'Available after church profile approval'
      },
      { title: 'Account Settings', url: '/parish', icon: User, onClick: () => setActiveTab?.('account'), isTab: true },
    ];
  }
  
  if (role === 'chancery_office') {
    return [
      { title: 'Dashboard Overview', url: '/', icon: Home },
      { title: 'Manage Church', url: '/churches', icon: Building },
      { title: 'User Management', url: '/user-management', icon: Users },
      { title: 'Announcements', url: '/announcements', icon: Megaphone },
      { title: 'Visitor Feedback', url: '/feedback', icon: MessageSquare },
      { title: 'Generate Reports', url: '/reports', icon: FileBarChart },
      { title: 'Account Settings', url: '/settings', icon: Settings },
    ];
  }
  
  if (role === 'museum_researcher') {
    return [
      // Core Dashboard
      { title: 'Dashboard', url: '/', icon: Home },
      
      // Heritage Church Management
      { title: 'Approved Churches', url: '/approved-churches', icon: Church },
      
      // Staff Management
      { title: 'Staff Management', url: '/staff-management', icon: Users },
      
      // Settings
      { title: 'Account Settings', url: '/settings', icon: Settings },
    ];
  }
  
  // Default fallback
  return [
    { title: 'Dashboard Overview', url: '/', icon: Home },
    { title: 'Manage Churches', url: '/churches', icon: Church },
    { title: 'Manage Announcements', url: '/announcements', icon: Megaphone },
    { title: 'Visitor Feedback', url: '/feedback', icon: MessageSquare },
    { title: 'Generate Reports', url: '/reports', icon: FileBarChart },
    { title: 'Account Settings', url: '/settings', icon: Settings },
  ];
};

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  churchApproved?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, churchApproved, onMobileClose }: SidebarProps = {}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userProfile } = useAuth();

  const isActive = (path: string, isTab?: boolean) => {
    if (isTab && userProfile?.role === 'parish') {
      // For parish secretary tabs, check if the item matches current active tab
      return false; // We'll handle active state differently for tabs
    }
    return location.pathname === path;
  };

  const isTabActive = (tabName: string) => {
    if (userProfile?.role !== 'parish') return false;
    
    // Map sidebar items to tab names
    const tabMap: { [key: string]: string } = {
      'Church Profile': 'overview',
      'Announcements': 'announcements',
      'Visitor Feedback': 'feedback',
      'Generate Reports': 'reports',
      'My Account': 'account'
    };
    
    return activeTab === tabMap[tabName];
  };

  const handleNavClick = (item: NavItem, e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    if (item.isTab && item.onClick) {
      e.preventDefault();
      item.onClick();
    }
    // Close mobile sidebar after navigation
    onMobileClose?.();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get role-specific sidebar class
  const getSidebarClass = () => {
    switch (userProfile?.role) {
      case 'parish':
        return 'sidebar-parish';
      case 'museum_researcher':
        return 'sidebar-museum';
      case 'chancery_office':
      default:
        return 'sidebar-chancery';
    }
  };

  return (
    <div
      className={cn(
        "bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col h-full",
        // Desktop (lg+): collapsible width
        "lg:relative lg:translate-x-0",
        isCollapsed ? "lg:w-16" : "lg:w-64",
        // Mobile & Tablet: full width drawer, always expanded content
        "w-72 sm:w-80",
        getSidebarClass()
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white">
            <img 
              src="/visita-logo.png" 
              alt="VISITA Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sidebar-foreground font-bold text-sm leading-tight">
                {userProfile?.role === 'chancery_office' && 'Chancery Office'}
                {userProfile?.role === 'museum_researcher' && 'Museum Staff'}
                {userProfile?.role === 'parish' && (userProfile?.position === 'parish_priest' ? 'Parish Priest' : 'Parish Secretary')}
              </h1>
              <p className="text-sidebar-foreground/70 text-xs">
                {userProfile?.role === 'museum_researcher' 
                  ? 'Heritage Church Review System'
                  : `VISITA Dashboard ${userProfile?.diocese ? `• ${userProfile.diocese}` : ''}`
                }
              </p>
            </div>
          )}
          {/* Mobile close button - visible on screens smaller than lg */}
          <button
            onClick={onMobileClose}
            aria-label="Close sidebar"
            title="Close sidebar"
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors duration-150 text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Desktop collapse button - only on lg screens and above */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors duration-150 text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* User Profile Section */}
      {!isCollapsed && (
        <div className="p-3 border-b border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                {userProfile?.name?.[0] || userProfile?.email?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground font-medium text-sm truncate">
                {userProfile?.institutionName || userProfile?.name || toTitleCase(userProfile?.email)}
              </p>
              <p className="text-sidebar-foreground/70 text-xs truncate">
                {userProfile?.role === 'museum_researcher' 
                  ? 'Museum Staff' 
                  : userProfile?.role === 'parish'
                    ? `${userProfile?.position === 'parish_priest' ? 'Parish Priest' : 'Parish Secretary'} • ${toTitleCase(userProfile?.diocese)}`
                    : `${toTitleCase(userProfile?.role)} • ${toTitleCase(userProfile?.diocese)}`}
              </p>
            </div>
          </div>
          
          {/* Simple status for Heritage Reviewer */}
          {userProfile?.role === 'museum_researcher' && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-sidebar-foreground/70">Museum Staff</span>
                <Badge variant="secondary" className="text-xs h-4 px-1">Active</Badge>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {getNavigationItems(userProfile?.role, setActiveTab, churchApproved).map((item) => {
          const isItemActive = item.isTab ? isTabActive(item.title) : isActive(item.url);

          return (
            <div key={item.title} className="relative">
              {item.isTab ? (
                <button
                  onClick={(e: React.MouseEvent) => handleNavClick(item, e)}
                  disabled={item.disabled}
                  className={cn(
                    "sidebar-nav-item w-full text-left relative",
                    isItemActive && "active",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium text-sm flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs h-5 px-1.5 badge">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {isCollapsed && item.badge && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-white text-xs flex items-center justify-center text-[8px]">
                      {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="sidebar-tooltip">
                      {item.title}
                      {item.badge && ` (${item.badge})`}
                      {item.disabled && item.disabledReason && (
                        <>
                          <br />
                          <span className="text-xs opacity-75">{item.disabledReason}</span>
                        </>
                      )}
                    </div>
                  )}
                </button>
              ) : (
                <NavLink
                  to={item.url}
                  onClick={() => onMobileClose?.()}
                  className={cn(
                    "sidebar-nav-item relative",
                    isItemActive && "active"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium text-sm flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs h-5 px-1.5 badge">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {isCollapsed && item.badge && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-white text-xs flex items-center justify-center text-[8px]">
                      {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="sidebar-tooltip">
                      {item.title}
                      {item.badge && ` (${item.badge})`}
                    </div>
                  )}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      {/* Heritage Quick Actions for Heritage Reviewer - Removed for simplicity */}

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        {!isCollapsed && (
          <div className="mb-3 text-xs text-sidebar-foreground/50 px-2">
            VISITA v1.0 • Diocese of {userProfile?.diocese || 'Tagbilaran'}
          </div>
        )}
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