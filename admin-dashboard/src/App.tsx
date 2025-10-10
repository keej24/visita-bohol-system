import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DioceseProtectedRoute } from "@/components/DioceseProtectedRoute";
import DioceseRouter from "./pages/DioceseRouter";

// Lazy load dashboard pages
import { 
  LazyTagbilaranDashboard,
  LazyTalibonDashboard, 
  LazyParishDashboard,
  LazyMuseumResearcherDashboard,
  LazyChurches,
  LazyReports,
  LazyAnnouncements,
  LazyFeedback,
  LazyAccountSettings,
  LazyApprovedChurches,
  LazyUserManagement
} from "@/components/LazyComponents";

// Keep login/auth pages eagerly loaded for better UX
import Login from "./pages/Login";
import AccountSetup from "./pages/AccountSetup";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

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
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<AccountSetup />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Main dashboard - routes to appropriate role-based dashboard */}
            <Route path="/" element={
              <ProtectedRoute>
                <DioceseRouter />
              </ProtectedRoute>
            } />
            
            {/* Parish Secretary Dashboard */}
            <Route path="/parish" element={
              <ProtectedRoute allowedRoles={['parish_secretary']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyParishDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Museum Researcher Dashboard */}
            <Route path="/heritage" element={
              <ProtectedRoute allowedRoles={['museum_researcher']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyMuseumResearcherDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Diocese-specific dashboards */}
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
            
            {/* Churches - accessible to all authenticated users */}
            <Route path="/churches" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyChurches />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Reports - restricted to Chancery Office only */}
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyReports />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Announcements - restricted to Chancery Office only */}
            <Route path="/announcements" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyAnnouncements />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* User Management - restricted to Chancery Office only */}
            <Route path="/user-management" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyUserManagement />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Feedback - restricted to Chancery Office only */}
            <Route path="/feedback" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyFeedback />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Account Settings - for Chancery Office and Museum Researchers */}
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['chancery_office', 'museum_researcher']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyAccountSettings />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Approved Churches - for Museum Researchers */}
            <Route path="/approved-churches" element={
              <ProtectedRoute allowedRoles={['museum_researcher']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyApprovedChurches />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Heritage routes for museum researchers */}
            <Route path="/heritage/*" element={
              <ProtectedRoute allowedRoles={['museum_researcher', 'chancery_office']}>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LazyMuseumResearcherDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Catch-all routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
