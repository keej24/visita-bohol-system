import { lazy } from 'react';

// Lazy load all dashboard pages for better performance
// Only include files that actually exist
export const LazyTagbilaranDashboard = lazy(() => import('@/pages/TagbilaranDashboard'));
export const LazyTalibonDashboard = lazy(() => import('@/pages/TalibonDashboard'));
export const LazyParishDashboard = lazy(() => import('@/pages/ParishDashboard'));
export const LazyMuseumResearcherDashboard = lazy(() => import('@/pages/MuseumResearcherDashboard'));
export const LazyChurches = lazy(() => import('@/pages/Churches'));
export const LazyReports = lazy(() => import('@/pages/Reports'));

// Stub components for missing pages
export const LazyAnnouncements = lazy(() => Promise.resolve({ default: () => <div>Announcements - Coming Soon</div> }));
export const LazyFeedback = lazy(() => Promise.resolve({ default: () => <div>Feedback - Coming Soon</div> }));
export const LazyAccountSettings = lazy(() => Promise.resolve({ default: () => <div>Account Settings - Coming Soon</div> }));
export const LazyApprovedChurches = lazy(() => Promise.resolve({ default: () => <div>Approved Churches - Coming Soon</div> }));
export const LazyUserManagement = lazy(() => Promise.resolve({ default: () => <div>User Management - Coming Soon</div> }));
