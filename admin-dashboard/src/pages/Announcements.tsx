/**
 * =============================================================================
 * ANNOUNCEMENTS.TSX - Diocese-Wide Announcements Page (Chancery Office)
 * =============================================================================
 *
 * PURPOSE:
 * This page allows Chancery Office users to manage diocese-wide announcements
 * that appear on the mobile app's homepage carousel. Only chancery_office role
 * users can access this page - others see an "Access Restricted" message.
 *
 * ANNOUNCEMENT TYPES (by scope):
 * - 'diocese': Created here, shown on mobile app homepage carousel
 * - 'parish': Created by Parish Secretaries in ParishDashboard, shown on
 *   individual parish pages only
 *
 * ACCESS CONTROL:
 * - Uses userProfile.role from AuthContext for permission check
 * - Only 'chancery_office' role can access
 * - All other roles see a friendly "Access Restricted" card
 *
 * COMPONENT STRUCTURE:
 * This is a thin wrapper that:
 * 1. Checks user permissions
 * 2. Renders Layout for consistent page structure
 * 3. Delegates actual announcement management to AnnouncementManagement
 *
 * WHY SEPARATE FROM AnnouncementManagement?
 * - Single responsibility: This page handles routing/access control
 * - AnnouncementManagement is reusable and focuses on CRUD operations
 * - Allows easy testing of access control separately from functionality
 *
 * RELATED FILES:
 * - components/announcements/AnnouncementManagement.tsx: The actual CRUD UI
 * - pages/ParishDashboard.tsx: Contains ParishAnnouncements for parish scope
 * - services/announcementService.ts: Firebase operations
 */

import React from 'react';
import { Layout } from '@/components/Layout';
import { AnnouncementManagement } from '@/components/announcements/AnnouncementManagement';
import { useAuth } from '@/contexts/AuthContext';
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