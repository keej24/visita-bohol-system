import React from 'react';
import { Layout } from '@/components/Layout';
import { UserManagement } from '@/components/UserManagement';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const UserManagementPage: React.FC = () => {
  const { userProfile } = useAuth();

  // Check if user has permission to manage users
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
                Only Chancery Office users can manage user accounts. Please contact your administrator if you need access.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <UserManagement diocese={userProfile.diocese} />
    </Layout>
  );
};

export default UserManagementPage;

