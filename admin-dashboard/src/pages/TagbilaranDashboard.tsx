/**
 * =============================================================================
 * TAGBILARAN DASHBOARD - Diocese-Specific Admin Interface
 * =============================================================================
 * 
 * PURPOSE:
 * This is the main dashboard for Chancery Office users in Tagbilaran Diocese.
 * It shows analytics, pending approvals, and management tools specific to
 * Tagbilaran churches.
 * 
 * WHO USES THIS:
 * - Role: chancery_office
 * - Diocese: tagbilaran only
 * - Access: Via /diocese/tagbilaran route (protected by DioceseProtectedRoute)
 * 
 * WHAT IT DISPLAYS:
 * - Pending church submissions waiting for approval
 * - Church statistics (total, heritage, non-heritage)
 * - Recent feedback from mobile app users
 * - Quick action buttons (create parish account, manage announcements)
 * - Visitor analytics and reports
 * 
 * HOW IT WORKS:
 * This file is a WRAPPER. It doesn't contain the actual dashboard logic.
 * Instead, it:
 * 1. Imports the reusable OptimizedChanceryDashboard component
 * 2. Passes "tagbilaran" as the diocese parameter
 * 3. That component handles all the data loading and display
 * 
 * WHY THIS PATTERN?
 * - Code Reuse: Same dashboard code works for Tagbilaran and Talibon
 * - Maintainability: Fix a bug once, it's fixed for both dioceses
 * - Performance: OptimizedChanceryDashboard uses React.memo to avoid re-renders
 * - Separation: This file is diocese-specific, the component is reusable
 * 
 * RELATED FILES:
 * - TalibonDashboard.tsx: Same pattern for Talibon diocese
 * - OptimizedChanceryDashboard.tsx: The actual dashboard implementation
 * - App.tsx: Routes /diocese/tagbilaran to this component
 * 
 * LEARNING PATH:
 * 1. Start here to understand the wrapper pattern
 * 2. Read OptimizedChanceryDashboard.tsx for dashboard logic
 * 3. Understand how diocese parameter filters data queries
 */

import { OptimizedChanceryDashboard } from "@/pages/optimized/OptimizedChanceryDashboard";

/**
 * TagbilaranDashboard Component
 * 
 * Simple wrapper that renders the optimized dashboard with "tagbilaran" diocese.
 * 
 * Data Flow:
 * 1. User visits /diocese/tagbilaran
 * 2. DioceseProtectedRoute verifies user is chancery_office in Tagbilaran
 * 3. This component renders
 * 4. OptimizedChanceryDashboard receives diocese="tagbilaran"
 * 5. All queries inside that component automatically filter by Tagbilaran
 * 
 * Example:
 * When fetching churches, the query becomes:
 * WHERE diocese == "tagbilaran"
 * 
 * This ensures Tagbilaran chancery NEVER sees Talibon data!
 */
const TagbilaranDashboard = () => {
  return <OptimizedChanceryDashboard diocese="tagbilaran" />;
};

export default TagbilaranDashboard;
