/**
 * =============================================================================
 * APP.TSX - MAIN APPLICATION ROUTER
 * =============================================================================
 * 
 * This is the "master map" of your entire admin dashboard.
 * It defines ALL the pages (routes) and who can access them.
 * 
 * THINK OF IT AS:
 * - A restaurant menu (all available pages)
 * - A bouncer at a club (checks if you can enter based on role)
 * - A GPS navigator (sends you to the right page)
 * 
 * KEY CONCEPTS:
 * 1. Routes: URLs that show different pages
 *    /login → Login page
 *    /parish → Parish Dashboard
 *    /diocese/tagbilaran → Chancery Tagbilaran Dashboard
 * 
 * 2. Protected Routes: Pages that require login + specific role
 *    Example: Only chancery_office can access /diocese/tagbilaran
 * 
 * 3. Lazy Loading: Pages load only when needed (faster initial load)
 *    Instead of loading all 10+ dashboards at once, load 1 at a time
 * 
 * LEARNING TIP:
 * When you see a page in the browser, look for its path here.
 * Example: You're on /parish → Find <Route path="/parish" element={...} />
 * That tells you which component is rendering!
 */

// ===========================
// STEP 1: IMPORT LIBRARIES
// ===========================

import { Suspense } from 'react';  // Shows loading spinner while page loads
import { Toaster } from "@/components/ui/toaster";  // Toast notifications (success/error messages)
import { Toaster as Sonner } from "@/components/ui/sonner";  // Alternative toast system
import { TooltipProvider } from "@/components/ui/tooltip";  // Enables tooltips throughout app
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";  // Data caching library
import { BrowserRouter, Routes, Route } from "react-router-dom";  // Page navigation system
import { AuthProvider } from "@/contexts/AuthContext";  // Provides user login info to all pages
import { ProtectedRoute } from "@/components/ProtectedRoute";  // Checks if user is logged in + has correct role
import { DioceseProtectedRoute } from "@/components/DioceseProtectedRoute";  // Extra check: correct diocese + role
import DioceseRouter from "./pages/DioceseRouter";  // Smart router that sends users to their correct dashboard

// ===========================
// STEP 2: IMPORT PAGES (LAZY LOADED)
// ===========================
// "Lazy" means: Don't load until user visits that page
// This makes the initial app load MUCH faster
// Instead of loading all 10+ dashboards, we load 1 at a time

import { 
  LazyTagbilaranDashboard,    // Chancery Office - Tagbilaran Diocese Dashboard
  LazyTalibonDashboard,       // Chancery Office - Talibon Diocese Dashboard
  LazyParishDashboard,        // Parish Secretary Dashboard
  LazyMuseumResearcherDashboard,  // Museum Researcher Dashboard
  LazyChurches,               // Church Management Page
  LazyReports,                // Analytics & Reports Page
  LazyAnnouncements,          // Announcements Management Page
  LazyFeedback,               // Feedback Moderation Page
  LazyAccountSettings,        // User Account Settings Page
  LazyApprovedChurches,       // Approved Churches List (for Museum)
  LazyUserManagement,         // User Management Page (create/edit users)
  LazyMuseumStaffManagement,  // Museum Staff Management Page
  LazyMigrateAccounts         // Parish Account Migration Tool
} from "@/components/LazyComponents";

// ===========================
// STEP 3: IMPORT AUTH PAGES (NOT LAZY)
// ===========================
// Login/auth pages load immediately (better UX)
// User shouldn't wait for login page to load

import Login from "./pages/Login";  // Login page (email + password)
import AccountSetup from "./pages/AccountSetup";  // First-time account setup
import Unauthorized from "./pages/Unauthorized";  // "You don't have permission" page
import NotFound from "./pages/NotFound";  // 404 page (page doesn't exist)
import Register from "./pages/Register";  // Registration page (for public users - not used much)
import { MuseumResearcherSetup } from "./pages/MuseumResearcherSetup";  // Museum researcher account setup
import EmailVerified from "./pages/EmailVerified";  // Mobile app email verification success page
import AuthAction from "./pages/AuthAction";  // Custom Firebase auth action handler (email verification, etc.)
import PasswordResetSuccess from "./pages/PasswordResetSuccess";  // Mobile app password reset success page
import ChancellorRegistration from "./pages/ChancellorRegistration";  // Chancellor self-registration page
import ParishStaffRegistration from "./pages/ParishStaffRegistration";  // Parish staff self-registration page
import MuseumStaffRegistration from "./pages/MuseumStaffRegistration";  // Museum researcher self-registration page
import PendingApproval from "./pages/PendingApproval";  // Waiting page for pending chancellor approval
import TermEnded from "./pages/TermEnded";  // Term ended page for archived chancellors/museum staff

// ===========================
// STEP 4: LOADING SPINNER
// ===========================
// Shows while lazy-loaded pages are downloading

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      {/* Spinning circle animation */}
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

// ===========================
// STEP 5: CONFIGURE DATA CACHING
// ===========================
// React Query handles data fetching and caching
// This makes the app feel faster (less loading, data stays fresh)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,  // If request fails, try 3 times before giving up
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),  // Wait longer between each retry
      staleTime: 5 * 60 * 1000,  // Data is "fresh" for 5 minutes (don't re-fetch)
      gcTime: 10 * 60 * 1000,    // Keep unused data in cache for 10 minutes
      refetchOnWindowFocus: false,  // Don't auto-refresh when you switch browser tabs
    },
  },
});

// ===========================
// STEP 6: MAIN APP COMPONENT
// ===========================
// This wraps the ENTIRE app with:
// - QueryClientProvider (data caching)
// - AuthProvider (user login state)
// - TooltipProvider (enables tooltips)
// - BrowserRouter (enables page navigation)

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          {/* ===========================
              STEP 7: DEFINE ALL ROUTES
              ===========================
              This is the "menu" of all pages.
              Each <Route> maps a URL path to a page component.
              
              PATTERN:
              <Route path="/url-here" element={<PageComponent />} />
          */}
          <Routes>
            
            {/* ===========================
                PUBLIC ROUTES
                No login required - anyone can access
                =========================== */}
            
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<AccountSetup />} />
            <Route path="/museum-setup" element={<MuseumResearcherSetup />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chancellor-register" element={<ChancellorRegistration />} />
            <Route path="/parish-register" element={<ParishStaffRegistration />} />
            <Route path="/museum-register" element={<MuseumStaffRegistration />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/term-ended" element={<TermEnded />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/email-verified" element={<EmailVerified />} />
            <Route path="/password-reset-success" element={<PasswordResetSuccess />} />
            <Route path="/auth/action" element={<AuthAction />} />
            
            {/* ===========================
                ROOT PATH (/)
                This is the "homepage" after login
                =========================== */}
            
            {/* 
              What happens when user goes to "/" ?
              1. ProtectedRoute checks: Are you logged in?
              2. DioceseRouter checks: What's your role and diocese?
              3. Automatically redirects you to YOUR dashboard
              
              Example:
              - Parish secretary in Tagbilaran → /parish
              - Chancery in Tagbilaran → /diocese/tagbilaran
              - Museum researcher → /heritage
            */}
            <Route path="/" element={
              <ProtectedRoute>
                <DioceseRouter />
              </ProtectedRoute>
            } />
            
            {/* ===========================
                ROLE-SPECIFIC DASHBOARDS
                =========================== */}
            
            {/* 
              PARISH SECRETARY DASHBOARD (/parish)
              
              WHO: Only parish role
              WHAT: Manages their assigned church
              
              Protection: ProtectedRoute with allowedRoles
              Lazy Load: Wrapped in <Suspense> to load page when needed
            */}
            <Route path="/parish" element={
              <ProtectedRoute allowedRoles={['parish']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyParishDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* 
              MUSEUM RESEARCHER DASHBOARD (/heritage)
              
              WHO: Only museum_researcher role
              WHAT: Validates heritage churches (ICP/NCT)
              
              Protection: ProtectedRoute with allowedRoles
            */}
            <Route path="/heritage" element={
              <ProtectedRoute allowedRoles={['museum_researcher']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyMuseumResearcherDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* ===========================
                DIOCESE-SPECIFIC DASHBOARDS
                EXTRA PROTECTION: Role + Diocese check
                =========================== */}
            
            {/* 
              TAGBILARAN DIOCESE DASHBOARD (/diocese/tagbilaran)
              
              WHO: Only chancery_office from Tagbilaran diocese
              WHAT: Manages all Tagbilaran churches, users, announcements
              
              Why DioceseProtectedRoute?
              - Checks role (must be chancery_office)
              - Checks diocese (must be tagbilaran)
              - Prevents Talibon chancery from accessing Tagbilaran data
            */}
            <Route path="/diocese/tagbilaran" element={
              <DioceseProtectedRoute 
                allowedRoles={['chancery_office']}
                requiredDiocese="tagbilaran"
              >
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyTagbilaranDashboard />
                </Suspense>
              </DioceseProtectedRoute>
            } />
            
            {/* 
              TALIBON DIOCESE DASHBOARD (/diocese/talibon)
              
              Same as above, but for Talibon diocese
            */}
            <Route path="/diocese/talibon" element={
              <DioceseProtectedRoute 
                allowedRoles={['chancery_office']}
                requiredDiocese="talibon"
              >
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyTalibonDashboard />
                </Suspense>
              </DioceseProtectedRoute>
            } />
            
            {/* ===========================
                SHARED FEATURE PAGES
                All authenticated users can access
                (Some features limited by role inside the page)
                =========================== */}
            
            {/* 
              CHURCHES PAGE (/churches)
              
              WHO: All authenticated users
              WHAT: View/manage churches (filters by user's permissions)
            */}
            <Route path="/churches" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyChurches />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* 
              REPORTS PAGE (/reports)
              
              WHO: Only chancery_office
              WHAT: Analytics, visitor logs, heritage status reports
              
              WHY RESTRICTED: Contains diocese-wide sensitive analytics
            */}
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyReports />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* 
              ANNOUNCEMENTS PAGE (/announcements)
              
              WHO: Only chancery_office
              WHAT: Create/manage diocese-wide announcements (homepage carousel)
            */}
            <Route path="/announcements" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyAnnouncements />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* 
              USER MANAGEMENT PAGE (/user-management)
              
              WHO: Only chancery_office
              WHAT: Create/edit/disable parish secretaries & museum researchers
              
              IMPORTANT: This is how new admin accounts are created!
            */}
            <Route path="/user-management" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyUserManagement />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* 
              MIGRATION TOOL PAGE (/migrate-accounts)
              
              WHO: Only chancery_office
              WHAT: Migrate legacy parish accounts to new unique identifier system
              
              IMPORTANT: One-time migration tool to update old accounts
            */}
            <Route path="/migrate-accounts" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyMigrateAccounts />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* 
              FEEDBACK PAGE (/feedback)
              
              WHO: Only chancery_office
              WHAT: Moderate public reviews/feedback from mobile app users
            */}
            <Route path="/feedback" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyFeedback />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* 
              ACCOUNT SETTINGS PAGE (/settings)
              
              WHO: chancery_office and museum_researcher
              WHAT: Change password, update profile
            */}
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['chancery_office', 'museum_researcher']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyAccountSettings />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* 
              APPROVED CHURCHES PAGE (/approved-churches)
              
              WHO: Only museum_researcher
              WHAT: List of churches they've already validated
            */}
            <Route path="/approved-churches" element={
              <ProtectedRoute allowedRoles={['museum_researcher']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyApprovedChurches />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* 
              STAFF MANAGEMENT PAGE (/staff-management)
              
              WHO: Only museum_researcher
              WHAT: View and approve pending museum researcher registrations
            */}
            <Route path="/staff-management" element={
              <ProtectedRoute allowedRoles={['museum_researcher']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyMuseumStaffManagement />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* 
              HERITAGE WILDCARD ROUTE (/heritage/*)
              
              WHO: museum_researcher and chancery_office
              WHAT: Heritage-related sub-routes (catches /heritage/anything)
              
              Why wildcard (*)?
              - Allows nested routes under /heritage
              - Example: /heritage/validate/church123
            */}
            <Route path="/heritage/*" element={
              <ProtectedRoute allowedRoles={['museum_researcher', 'chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyMuseumResearcherDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* ===========================
                404 CATCH-ALL ROUTE
                =========================== */}
            
            {/* 
              Matches ANY other URL that doesn't exist
              Example: /this-doesnt-exist → Shows NotFound page
              
              MUST be last route! Order matters in React Router.
            */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

/**
 * =============================================================================
 * LEARNING NOTES - HOW THIS FILE WORKS
 * =============================================================================
 * 
 * WHEN YOU VISIT A URL:
 * ---------------------
 * 1. React Router matches the URL to a <Route path="...">
 * 2. ProtectedRoute checks: "Are you logged in?"
 * 3. ProtectedRoute checks: "Do you have the right role?"
 * 4. If OK → Shows the page
 * 5. If NOT OK → Redirects to /login or /unauthorized
 * 
 * EXAMPLE FLOW (Parish Secretary visits /parish):
 * ------------------------------------------------
 * URL: /parish
 * ↓
 * React Router finds: <Route path="/parish" ...>
 * ↓
 * ProtectedRoute checks auth: ✅ User is logged in
 * ↓
 * ProtectedRoute checks role: ✅ User is parish
 * ↓
 * Shows: ParishDashboard component
 * 
 * EXAMPLE FLOW (Parish Secretary tries /diocese/tagbilaran):
 * -----------------------------------------------------------
 * URL: /diocese/tagbilaran
 * ↓
 * React Router finds: <Route path="/diocese/tagbilaran" ...>
 * ↓
 * DioceseProtectedRoute checks auth: ✅ User is logged in
 * ↓
 * DioceseProtectedRoute checks role: ❌ User is parish (needs chancery_office)
 * ↓
 * Redirects to: /unauthorized
 * 
 * HOW TO ADD A NEW PAGE:
 * ----------------------
 * 1. Create the page component in src/pages/YourNewPage.tsx
 * 2. Add it to LazyComponents.tsx for lazy loading
 * 3. Add a route here:
 *    <Route path="/your-new-page" element={
 *      <ProtectedRoute allowedRoles={['your_role']}>
 *        <Suspense fallback={<PageLoadingFallback />}>
 *          <LazyYourNewPage />
 *        </Suspense>
 *      </ProtectedRoute>
 *    } />
 * 
 * COMMON PATTERNS:
 * ----------------
 * - Public page (no login): Just <Route path="..." element={<Component />} />
 * - Auth required (any role): <ProtectedRoute> (no allowedRoles)
 * - Specific role: <ProtectedRoute allowedRoles={['role_name']}>
 * - Diocese check: <DioceseProtectedRoute requiredDiocese="tagbilaran">
 * 
 * WHERE TO LEARN MORE:
 * --------------------
 * - ProtectedRoute: src/components/ProtectedRoute.tsx
 * - DioceseProtectedRoute: src/components/DioceseProtectedRoute.tsx
 * - AuthContext: src/contexts/AuthContext.tsx
 * - React Router Docs: https://reactrouter.com/
 */

