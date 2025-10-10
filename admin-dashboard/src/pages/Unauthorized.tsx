// Unauthorized access page
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-heritage-cream p-4">
      <Card className="w-full max-w-md heritage-card text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-destructive rounded-full flex items-center justify-center mb-4">
            <ShieldX className="w-8 h-8 text-destructive-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userProfile && (
            <div className="text-sm text-muted-foreground">
              <p>Current role: <span className="font-medium">{userProfile.role}</span></p>
              <p>Logged in as: <span className="font-medium">{userProfile.email}</span></p>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            
            <Button 
              onClick={() => logout()}
              variant="destructive"
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
