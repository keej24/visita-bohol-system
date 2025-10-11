import { Bell, User, ChevronDown, LogOut, Church as ChurchIcon, Key, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export function Header({ setActiveTab }: HeaderProps) {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const isParish = userProfile?.role === 'parish_secretary';

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleParishProfile = () => {
    if (setActiveTab) {
      setActiveTab('overview'); // This will show the main dashboard with profile form access
    }
  };

  const handleMyAccount = () => {
    if (setActiveTab) {
      setActiveTab('account'); // This will show the account management page
    }
  };

  const handleChangePassword = () => {
    if (setActiveTab) {
      // Navigate to account page and focus on password section
      setActiveTab('account');
      // Could add a URL hash or state to focus on password section
    }
  };

  const handleProfileSettings = () => {
    // For non-parish users, navigate to settings or show a basic profile modal
    if (setActiveTab) {
      setActiveTab('settings');
    } else {
      // Fallback to navigate to settings page
      navigate('/settings');
    }
  };

  const handleAccountSecurity = () => {
    // Navigate to account settings page with security tab
    if (setActiveTab) {
      setActiveTab('account');
    } else {
      // Fallback to navigate to account settings
      navigate('/settings');
    }
  };
  return (
    <header className={
      isParish
        ? "border-b border-border px-6 py-4 bg-gradient-to-r from-primary/5 to-accent/5"
        : "bg-card border-b border-border px-6 py-4"
    }>
      <div className="flex items-center justify-between">
        {/* Left side - Title */}
        <div className="flex items-start gap-3">
          {isParish && (
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
              <ChurchIcon className="w-5 h-5 text-accent-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {userProfile?.role === 'chancery_office' && 'Chancery Office Dashboard'}
              {userProfile?.role === 'museum_researcher' && 'Heritage Research Dashboard'}
              {userProfile?.role === 'parish_secretary' && 'Parish Secretary Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isParish ? 'Manage your parish church profile and announcements' : 'VISITA: Bohol Churches Information System'}
            </p>
            {isParish && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {userProfile?.parish || 'Parish'}
                </Badge>
                {userProfile?.diocese && (
                  <Badge variant="secondary" className="text-xs">Diocese of {userProfile.diocese}</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Notifications and Profile */}
        <div className="flex items-center gap-4">
          {/* Notifications - Dynamic Dropdown */}
          {!isParish && <NotificationDropdown />}

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3">
                <div className={isParish ? "w-8 h-8 bg-accent rounded-full flex items-center justify-center" : "w-8 h-8 bg-primary rounded-full flex items-center justify-center"}>
                  <User className={isParish ? "w-4 h-4 text-accent-foreground" : "w-4 h-4 text-primary-foreground"} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">
                    {userProfile?.name || 'Administrator'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userProfile?.role?.replace('_', ' ') || 'User'} 
                    {userProfile?.diocese && ` • ${userProfile.diocese}`}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isParish ? (
                <>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={handleParishProfile}
                  >
                    <ChurchIcon className="w-4 h-4 mr-2" />
                    Parish Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={handleMyAccount}
                  >
                    <UserCircle className="w-4 h-4 mr-2" />
                    My Account
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={handleChangePassword}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={handleProfileSettings}
                  >
                    <UserCircle className="w-4 h-4 mr-2" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleAccountSecurity}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Account Security
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
