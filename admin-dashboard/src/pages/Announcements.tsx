import React from 'react';
import { Layout } from '@/components/Layout';
import { AnnouncementManagement } from '@/components/announcements/AnnouncementManagement';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const Announcements: React.FC = () => {
  const { userProfile } = useAuth();

  // Check if user has permission to manage announcements
  if (!userProfile || userProfile.role !== 'chancery_office') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Access Restricted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Only Chancery Office users can manage announcements. Please contact your administrator if you need access.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <AnnouncementManagement diocese={userProfile.diocese} />
    </Layout>
  );
};

export default Announcements;

