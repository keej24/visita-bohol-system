/**
 * =============================================================================
 * MUSEUM STAFF MANAGEMENT PAGE - Museum Researcher User Management
 * =============================================================================
 *
 * PURPOSE:
 * This page allows current Museum Researchers to view and manage pending
 * registration requests from new museum researcher applicants.
 *
 * ACCESS CONTROL:
 * - Only 'museum_researcher' role can access this page
 * - Shows pending registrations for museum researcher positions
 */

import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { PendingMuseumStaff } from '@/components/PendingMuseumStaff';
import { Users, AlertTriangle } from 'lucide-react';

const MuseumStaffManagement = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // Check if user has permission to manage museum staff
  if (!userProfile || userProfile.role !== 'museum_researcher') {
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
                Only Museum Researchers can access staff management. Please contact your administrator if you need access.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            Staff Management
          </h1>
          <p className="text-gray-600 mt-1">
            Review and manage pending museum researcher registrations
          </p>
        </div>

        {/* Pending Museum Staff Registrations */}
        <PendingMuseumStaff
          currentUser={userProfile}
          onStaffApproved={() => {
            toast({
              title: "Researcher Approved",
              description: "The new museum researcher has been activated successfully.",
            });
          }}
        />
      </div>
    </Layout>
  );
};

export default MuseumStaffManagement;
