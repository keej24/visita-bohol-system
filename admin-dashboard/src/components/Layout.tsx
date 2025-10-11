import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  churchApproved?: boolean;
}

export function Layout({ children, activeTab, setActiveTab, churchApproved }: LayoutProps) {
  const { userProfile } = useAuth();
  const isParish = userProfile?.role === 'parish_secretary';
  return (
    <div className={isParish ? "min-h-screen flex w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 to-background" : "min-h-screen bg-background flex w-full"}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} churchApproved={churchApproved} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
