import { User, ChevronDown, LogOut, Church as ChurchIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
// TODO: Re-enable when notification system is fully implemented
// import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ChurchService } from "@/services/churchService";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export function Header({ setActiveTab }: HeaderProps) {
  const { userProfile, logout } = useAuth();
  const { toast } = useToast();
  const isParish = userProfile?.role === 'parish_secretary';
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
            setParishName(parishChurch.fullName || parishChurch.name || userProfile.parish);
          } else {
            setParishName(userProfile.parish);
          }
        } catch (error) {
          console.error('Error fetching parish name:', error);
          setParishName(userProfile.parish);
        }
      }
    };

    fetchParishName();
  }, [isParish, userProfile?.parish, userProfile?.diocese]);

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
              {userProfile?.role === 'museum_researcher' && 'Heritage Reviewer Dashboard'}
              {userProfile?.role === 'parish_secretary' && 'Parish Secretary Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isParish ? 'Manage your parish church profile and announcements' : 'VISITA: Bohol Churches Information System'}
            </p>
            {isParish && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {parishName || userProfile?.parish || 'Parish'}
                </Badge>
                {userProfile?.diocese && (
                  <Badge variant="secondary" className="text-xs">Diocese of {userProfile.diocese}</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Profile */}
        <div className="flex items-center gap-4">
          {/* TODO: Re-enable notification bell when backend is fully implemented */}
          {/* {!isParish && <NotificationDropdown />} */}

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
