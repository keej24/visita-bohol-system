// Diocese selection and routing component
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, Suspense } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  LazyTagbilaranDashboard,
  LazyTalibonDashboard,
  LazyParishDashboard,
  LazyMuseumResearcherDashboard
} from "@/components/LazyComponents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Church } from "lucide-react";
import { Navigate } from "react-router-dom";

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading dashboard...</p>
    </div>
  </div>
);

const DioceseRouter = () => {
  const { userProfile, loading, user, profileCreating } = useAuth();
  const [profileLoadTimeout, setProfileLoadTimeout] = useState(false);

  // Set a timeout to show error only after reasonable wait time
  // Don't show timeout error if profile is being created
  useEffect(() => {
    if (user && !userProfile && !loading && !profileCreating) {
      const timer = setTimeout(() => {
        setProfileLoadTimeout(true);
      }, 5000); // Wait 5 seconds before showing error

      return () => clearTimeout(timer);
    } else {
      setProfileLoadTimeout(false);
    }
  }, [user, userProfile, loading, profileCreating]);

  // Show loading while authenticating or fetching profile
  // Show special message when creating profile for first-time known accounts
  if (loading || profileCreating || (user && !userProfile && !profileLoadTimeout)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">
            {profileCreating ? 'Setting up your account...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user but no profile after timeout, show error
  if (!userProfile && profileLoadTimeout) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Profile Access Issue</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your account is authenticated but we couldn't load your profile information.
            This may be a temporary issue.
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Parish secretaries get their own dashboard
  if (userProfile.role === 'parish_secretary') {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <LazyParishDashboard />
      </Suspense>
    );
  }

  // Museum researchers get their heritage-focused dashboard
  if (userProfile.role === 'museum_researcher') {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <LazyMuseumResearcherDashboard />
      </Suspense>
    );
  }

  // Route based on user's diocese for chancery office
  switch (userProfile.diocese) {
    case 'tagbilaran':
      return (
        <Suspense fallback={<PageLoadingFallback />}>
          <LazyTagbilaranDashboard />
        </Suspense>
      );
    case 'talibon':
      return (
        <Suspense fallback={<PageLoadingFallback />}>
          <LazyTalibonDashboard />
        </Suspense>
      );
    default:
      // Users without specific diocese assignment
      return <DioceseSelection />;
  }
};

const DioceseSelection = () => {
  const { userProfile } = useAuth();

  return (
    <div className="min-h-screen bg-heritage-cream p-4">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">VISITA: Bohol Churches Information System</h1>
          <p className="text-muted-foreground">Select a diocese to manage or view as {userProfile?.role?.replace('_', ' ')}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Diocese of Tagbilaran */}
          <Card className="heritage-card hover:shadow-[var(--shadow-medium)] transition-all duration-200 cursor-pointer">
            <CardHeader>
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <Church className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl text-center text-primary">Diocese of Tagbilaran</CardTitle>
              <CardDescription className="text-center">
                Main administrative diocese covering central Bohol
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>24 Parishes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Church className="w-4 h-4 text-muted-foreground" />
                  <span>8 Heritage Sites</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>12 Active Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>Founded 1595</span>
                </div>
              </div>
              <Button 
                className="w-full btn-heritage"
                onClick={() => window.location.href = '/diocese/tagbilaran'}
              >
                Access Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Diocese of Talibon */}
          <Card className="heritage-card hover:shadow-[var(--shadow-medium)] transition-all duration-200 cursor-pointer">
            <CardHeader>
              <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                <Church className="w-8 h-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-xl text-center text-primary">Diocese of Talibon</CardTitle>
              <CardDescription className="text-center">
                Northern diocese serving the coastal parishes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>18 Parishes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Church className="w-4 h-4 text-muted-foreground" />
                  <span>6 Heritage Sites</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>9 Active Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>Founded 2008</span>
                </div>
              </div>
              <Button 
                className="w-full btn-accent"
                onClick={() => window.location.href = '/diocese/talibon'}
              >
                Access Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        {userProfile?.role === 'museum_researcher' && (
          <Card className="heritage-card mt-6">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                As a Museum Researcher, you have read access to heritage content across both dioceses.
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => window.location.href = '/heritage/overview'}>
                  Heritage Overview
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/reports/heritage'}>
                  Heritage Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DioceseRouter;
