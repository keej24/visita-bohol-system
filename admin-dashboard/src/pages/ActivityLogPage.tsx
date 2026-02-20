/**
 * =============================================================================
 * ACTIVITY LOG PAGE - Standalone Activity Log for Museum Researchers
 * =============================================================================
 *
 * PURPOSE:
 * Provides a full-page view of audit logs for museum researchers.
 * Museum researchers can see all activity across both dioceses since
 * their role spans the entire system.
 *
 * ACCESS CONTROL:
 * - Only 'museum_researcher' role can access this page (enforced by route guard)
 *
 * WRAPPED IN:
 * - Layout component for consistent sidebar + header
 */

import { Layout } from '@/components/Layout';
import { AuditLogViewer } from '@/components/AuditLogViewer';

const ActivityLogPage = () => {
  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-600 mt-1">
            View all system activity across both dioceses
          </p>
        </div>
        <AuditLogViewer mode="all" limit={100} />
      </div>
    </Layout>
  );
};

export default ActivityLogPage;
