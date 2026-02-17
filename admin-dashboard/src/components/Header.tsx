/**
 * =============================================================================
 * HEADER.TSX - Main Navigation Header Component
 * =============================================================================
 *
 * PURPOSE:
 * This component renders the top header bar that appears on all dashboard pages.
 * It displays the user's role, parish/diocese info, and provides logout functionality.
 *
 * VISUAL LAYOUT:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ [Icon] Dashboard Title                          [Notification] [User Menu] │
 * │        Subtitle / System Name                                  [Logout ▼]  │
 * │        [Parish Badge] [Diocese Badge]                                      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ROLE-BASED DISPLAY:
 * ┌──────────────────────┬─────────────────────────────────────────────────────┐
 * │ Role                 │ Header Display                                      │
 * ├──────────────────────┼─────────────────────────────────────────────────────┤
 * │ chancery_office      │ "Chancery Office Dashboard" + diocese info          │
 * │ parish               │ "Parish Secretary Dashboard" + parish/diocese badge │
 * │ museum_researcher    │ "Museum Researcher Dashboard"                      │
 * └──────────────────────┴─────────────────────────────────────────────────────┘
 *
 * KEY FEATURES:
 * 1. Dynamic title based on user role
 * 2. Parish name fetching for parish secretaries
 * 3. Logout with confirmation overlay
 * 4. Toast notifications for logout success/failure
 * 5. Gradient background for parish secretaries (visual distinction)
 *
 * LOGOUT FLOW:
 * 1. User clicks Logout → handleSignOut called
 * 2. Show success toast immediately (better UX)
 * 3. Wait 1.5s so user sees the message
 * 4. Call logout() from AuthContext
 * 5. ProtectedRoute detects no user → redirects to /login
 *
 * WHY FETCH PARISH NAME?
 * - Firestore stores parish as church ID (e.g., "church_123")
 * - Users want to see the actual name ("San Jose Parish Church")
 * - We fetch the church document to get the display name
 *
 * RELATED FILES:
 * - Layout.tsx: Wrapper that includes this Header + Sidebar
 * - contexts/AuthContext.tsx: Provides userProfile and logout()
 * - services/churchService.ts: ChurchService.getChurches for parish name
 */

import { User, ChevronDown, LogOut, Church as ChurchIcon, Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ParishNotificationDropdown } from "@/components/parish/ParishNotificationDropdown";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ChurchService } from "@/services/churchService";
import { useToast } from "@/hooks/use-toast";
import { toTitleCase } from "@/lib/utils";

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onMobileMenuClick?: () => void;
}

export function Header({ setActiveTab, onMobileMenuClick }: HeaderProps) {
  const { userProfile, logout } = useAuth();
  const { toast } = useToast();
  const isParish = userProfile?.role === 'parish';
  const [parishName, setParishName] = useState<string>('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch parish church name for parish secretaries
  useEffect(() => {
    const fetchParishName = async () => {
      if (isParish && userProfile?.parish && userProfile?.diocese) {
        try {
          const churches = await ChurchService.getChurches({
            diocese: userProfile.diocese
          });
          
          // Find the church matching the parish ID
          const parishChurch = churches.find(church => church.id === userProfile.parish);
          
          if (parishChurch) {
            setParishName(parishChurch.fullName || parishChurch.name || userProfile.parishInfo?.name || userProfile.name || '');
          } else {
            setParishName(userProfile.parishInfo?.name || userProfile.name || '');
          }
        } catch (error) {
          console.error('Error fetching parish name:', error);
          setParishName(userProfile.parishInfo?.name || userProfile.name || '');
        }
      }
    };

    fetchParishName();
  }, [isParish, userProfile?.parish, userProfile?.diocese, userProfile?.parishInfo?.name, userProfile?.name]);

  const handleSignOut = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    setIsLoggingOut(true);
    
    try {
      // Show success toast immediately
      toast({
        title: "Logged Out Successfully",
        description: "You have been securely logged out. See you next time!",
        duration: 5000, // Show for 5 seconds
      });
      
      // Wait longer to ensure user sees the message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Perform logout - ProtectedRoute will handle redirect automatically
      await logout();
      
    } catch (error) {
      console.error('Error signing out:', error);
      setIsLoggingOut(false);
      toast({
        title: "Logout Failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <>
      {/* Logout Overlay - Shows while logging out */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border border-border rounded-lg p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="flex flex-col items-center space-y-6">
              {/* Animated Spinner */}
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary/20"></div>
              </div>
              
              {/* Message */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Logging Out</h3>
                <p className="text-muted-foreground">
                  Securely ending your session...
                </p>
                <p className="text-sm text-muted-foreground/80 pt-2">
                  Thank you for using VISITA
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <header className={
        isParish
          ? "border-b border-border px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-primary/5 to-accent/5"
          : "bg-card border-b border-border px-4 md:px-6 py-3 md:py-4"
      }>
      <div className="flex items-center justify-between">
        {/* Left side - Mobile menu button + Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile hamburger menu - visible on screens smaller than lg */}
          <button
            onClick={onMobileMenuClick}
            aria-label="Open menu"
            title="Open menu"
            className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg hover:bg-accent transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
          </button>
          
          {isParish && (
            <div className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 bg-accent rounded-lg items-center justify-center flex-shrink-0">
              <ChurchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
              {/* Shorter titles on mobile */}
              <span className="hidden sm:inline">
                {userProfile?.role === 'chancery_office' && 'Chancery Office Dashboard'}
                {userProfile?.role === 'museum_researcher' && 'Museum Staff Dashboard'}
                {userProfile?.role === 'parish' && (userProfile?.position === 'parish_priest' ? 'Parish Priest Dashboard' : 'Parish Secretary Dashboard')}
              </span>
              <span className="sm:hidden">
                {userProfile?.role === 'chancery_office' && 'Chancery'}
                {userProfile?.role === 'museum_researcher' && 'Museum'}
                {userProfile?.role === 'parish' && 'Parish'}
              </span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
              {isParish ? 'Manage your parish church profile and announcements' : 'VISITA: Bohol Churches Information System'}
            </p>
            {isParish && (
              <div className="flex items-center gap-2 mt-1 md:mt-2">
                <Badge variant="outline" className="text-xs">
                  {parishName || userProfile?.parishInfo?.name || userProfile?.name || 'Parish'}
                </Badge>
                {userProfile?.diocese && (
                  <Badge variant="secondary" className="text-xs hidden sm:inline-flex">Diocese of {userProfile.diocese}</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Profile */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
          {/* Notification Bell - Different component for Parish vs Others */}
          {isParish ? <ParishNotificationDropdown /> : <NotificationDropdown />}

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 md:px-3 h-9 sm:h-10">
                <div className={isParish ? "w-7 h-7 sm:w-8 sm:h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0" : "w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0"}>
                  <User className={isParish ? "w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-foreground" : "w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground"} />
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium">
                    {userProfile?.institutionName || userProfile?.name || 'Administrator'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userProfile?.role === 'parish' 
                      ? (userProfile?.position === 'parish_priest' ? 'Parish Priest' : 'Parish Secretary')
                      : userProfile?.role === 'museum_researcher' ? 'Museum Staff'
                      : toTitleCase(userProfile?.role)}
                    {userProfile?.diocese && ` • ${toTitleCase(userProfile.diocese)}`}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={handleSignOut}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
    </>
  );
}
