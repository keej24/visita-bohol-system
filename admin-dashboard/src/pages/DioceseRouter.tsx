// Diocese selection and routing component
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import TagbilaranDashboard from "./TagbilaranDashboard";
import TalibonDashboard from "./TalibonDashboard";
import ParishDashboard from "./ParishDashboard";
import MuseumResearcherDashboard from "./MuseumResearcherDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Church } from "lucide-react";
import { Navigate } from "react-router-dom";

const DioceseRouter = () => {
  const { userProfile, loading, user } = useAuth();
  const [retrying, setRetrying] = useState(false);

  // If user is authenticated but profile missing, attempt one silent refetch
  useEffect(() => {
    (async () => {
      if (!loading && user && !userProfile && !retrying) {
        try {
          setRetrying(true);
          console.log('DioceseRouter - Attempting profile refetch');
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (!docSnap.exists()) {
            console.warn('DioceseRouter - Profile still missing after refetch');
          } else {
            console.log('DioceseRouter - Profile became available after refetch');
          }
        } catch (e) {
          console.error('DioceseRouter - Refetch failed (likely rules).');
        }
      }
    })();
  }, [loading, user, userProfile, retrying]);

  // Debug logging
  console.log('DioceseRouter - Loading:', loading);
  console.log('DioceseRouter - UserProfile:', userProfile);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!userProfile) {
    if (user && !retrying) {
      // Show spinner while we try once to refetch profile
      return <LoadingSpinner />;
    }
    if (user && retrying) {
      console.error('DioceseRouter - Authenticated but no profile. Possible Firestore rules issue.');
  return <div className="p-6 text-center text-sm text-red-600">Authenticated but profile not accessible. Verify Firestore rule: match /users/(userId) allow read if request.auth.uid == userId.</div>;
    }
    console.log('DioceseRouter - No user, redirecting');
    return <Navigate to="/login" replace />;
  }

  console.log('DioceseRouter - Routing decision for:', {
    role: userProfile.role,
    diocese: userProfile.diocese,
    email: userProfile.email
  });

  // Parish secretaries get their own dashboard
  if (userProfile.role === 'parish_secretary') {
    console.log('DioceseRouter - Routing to ParishDashboard');
    return <ParishDashboard />;
  }

  // Museum researchers get their heritage-focused dashboard
  if (userProfile.role === 'museum_researcher') {
    console.log('DioceseRouter - Routing to MuseumResearcherDashboard');
    return <MuseumResearcherDashboard />;
  }

  // Route based on user's diocese for chancery office
  console.log('DioceseRouter - Checking diocese for chancery office:', userProfile.diocese);
  switch (userProfile.diocese) {
    case 'tagbilaran':
      console.log('DioceseRouter - Routing to TagbilaranDashboard');
      return <TagbilaranDashboard />;
    case 'talibon':
      console.log('DioceseRouter - Routing to TalibonDashboard');
      return <TalibonDashboard />;
    default:
      console.log('DioceseRouter - No specific diocese, showing DioceseSelection');
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

