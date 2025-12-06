/**
 * =============================================================================
 * LAYOUT.TSX - Page Layout Container Component
 * =============================================================================
 *
 * PURPOSE:
 * This is the "frame" that wraps every dashboard page. It provides the
 * consistent layout structure with Sidebar on the left, Header on top,
 * and main content in the center.
 *
 * VISUAL STRUCTURE (Desktop):
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │ ┌──────────┬────────────────────────────────────────────────────────────┐ │
 * │ │          │                    HEADER                                 │ │
 * │ │          ├────────────────────────────────────────────────────────────┤ │
 * │ │          │                                                            │ │
 * │ │ SIDEBAR  │                    MAIN CONTENT                           │ │
 * │ │          │                    (children)                              │ │
 * │ │          │                                                            │ │
 * │ │          │                                                            │ │
 * │ └──────────┴────────────────────────────────────────────────────────────┘ │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * VISUAL STRUCTURE (Mobile):
 * ┌─────────────────────────────────────────┐
 * │ [☰] HEADER                              │
 * ├─────────────────────────────────────────┤
 * │                                         │
 * │         MAIN CONTENT                    │
 * │         (children)                      │
 * │                                         │
 * └─────────────────────────────────────────┘
 * (Sidebar opens as overlay when hamburger clicked)
 *
 * PROPS:
 * - children: The actual page content (dashboard, forms, tables, etc.)
 * - activeTab: Current active tab (for parish secretary dashboard)
 * - setActiveTab: Function to change tabs (for parish secretary dashboard)
 * - churchApproved: Whether parish secretary's church is approved (enables/disables menu items)
 *
 * ROLE-BASED STYLING:
 * - Parish Secretary: Radial gradient background (primary/5 to background)
 * - Other roles: Plain background color
 *
 * WHY SEPARATE LAYOUT COMPONENT?
 * 1. DRY (Don't Repeat Yourself) - Every page needs sidebar + header
 * 2. Consistency - All pages look the same structurally
 * 3. State sharing - activeTab flows from page through Layout to Sidebar/Header
 * 4. Theming - Easy to change layout for all pages at once
 *
 * USAGE:
 * ```tsx
 * // In a page component
 * <Layout activeTab={activeTab} setActiveTab={setActiveTab} churchApproved={true}>
 *   <DashboardContent />
 * </Layout>
 * ```
 *
 * RELATED FILES:
 * - Sidebar.tsx: Left navigation sidebar
 * - Header.tsx: Top header bar
 * - pages/*.tsx: All dashboard pages use this Layout
 */

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/hooks/useAuth";

/**
 * Props for Layout component
 * 
 * @param children - Page content to render in main area
 * @param activeTab - Current active tab (for tab-based dashboards)
 * @param setActiveTab - Function to switch tabs
 * @param churchApproved - Parish approval status (affects sidebar)
 */
interface LayoutProps {
  children: ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  churchApproved?: boolean;
}

export function Layout({ children, activeTab, setActiveTab, churchApproved }: LayoutProps) {
  const { userProfile } = useAuth();
  const isParish = userProfile?.role === 'parish_secretary';
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className={isParish ? "min-h-screen flex w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 to-background" : "min-h-screen bg-background flex w-full"}>
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}
      
      {/* Sidebar - Hidden on mobile, shown on lg+ */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:z-0
        transform transition-transform duration-300 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab?.(tab);
            closeMobileSidebar(); // Close sidebar on mobile after navigation
          }} 
          churchApproved={churchApproved}
          onMobileClose={closeMobileSidebar}
        />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          onMobileMenuClick={toggleMobileSidebar}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
