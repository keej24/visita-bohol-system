import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DioceseProtectedRoute } from "@/components/DioceseProtectedRoute";
import DioceseRouter from "./pages/DioceseRouter";
import TagbilaranDashboard from "./pages/TagbilaranDashboard";
import TalibonDashboard from "./pages/TalibonDashboard";
import ParishDashboard from "./pages/ParishDashboard";
import MuseumResearcherDashboard from "./pages/MuseumResearcherDashboard";
import Churches from "./pages/Churches";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import AccountSetup from "./pages/AccountSetup";
import TestLogin from "./pages/TestLogin";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<AccountSetup />} />
            <Route path="/register" element={<Register />} />
            <Route path="/test-login" element={<TestLogin />} />
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
                <ParishDashboard />
              </ProtectedRoute>
            } />
            
            {/* Museum Researcher Dashboard */}
            <Route path="/heritage" element={
              <ProtectedRoute allowedRoles={['museum_researcher']}>
                <MuseumResearcherDashboard />
              </ProtectedRoute>
            } />
            
            {/* Diocese-specific dashboards */}
            <Route path="/diocese/tagbilaran" element={
              <DioceseProtectedRoute 
                allowedRoles={['chancery_office']}
                requiredDiocese="tagbilaran"
              >
                <TagbilaranDashboard />
              </DioceseProtectedRoute>
            } />
            
            <Route path="/diocese/talibon" element={
              <DioceseProtectedRoute 
                allowedRoles={['chancery_office']}
                requiredDiocese="talibon"
              >
                <TalibonDashboard />
              </DioceseProtectedRoute>
            } />
            
            {/* Churches - accessible to all authenticated users */}
            <Route path="/churches" element={
              <ProtectedRoute>
                <Churches />
              </ProtectedRoute>
            } />
            
            {/* Reports - restricted to Chancery Office only */}
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['chancery_office']}>
                <Reports />
              </ProtectedRoute>
            } />
            
            {/* Heritage routes for museum researchers */}
            <Route path="/heritage/*" element={
              <ProtectedRoute allowedRoles={['museum_researcher', 'chancery_office']}>
                <MuseumResearcherDashboard />
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
