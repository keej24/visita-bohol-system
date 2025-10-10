import React, { useState, Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MapPin, Plus, Menu, Bell, Settings } from 'lucide-react';
import { LazyCreateParishAccountModal } from '@/components/LazyComponents';
import type { Diocese } from '@/contexts/AuthContext';

interface MobileHeaderProps {
  diocese: Diocese;
  userProfile: {
    name?: string;
    role?: string;
  } | null;
}

const dioceseConfig = {
  tagbilaran: {
    name: 'Diocese of Tagbilaran',
    shortName: 'Tagbilaran',
    description: 'Managing churches and parishes',
    color: 'bg-blue-600',
  },
  talibon: {
    name: 'Diocese of Talibon',
    shortName: 'Talibon', 
    description: 'Managing churches and parishes',
    color: 'bg-green-600',
  },
};

const MobileHeader: React.FC<MobileHeaderProps> = ({ diocese, userProfile }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const config = dioceseConfig[diocese];

  return (
    <div className="heritage-card-accent bg-gradient-to-r from-primary/5 to-accent/5">
      {/* Mobile Header */}
      <div className="p-4 sm:hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${config.color} rounded-xl flex items-center justify-center`}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary">
                {config.shortName}
              </h1>
              <p className="text-xs text-muted-foreground">
                Chancery Office
              </p>
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96">
              <MobileMenu diocese={diocese} userProfile={userProfile} onClose={() => setIsMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {userProfile?.name}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {userProfile?.role?.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:block p-6">
        <div className="flex items-center gap-4 justify-between">
          <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center`}>
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-primary mb-1">
              {config.name} - Chancery Office
            </h1>
            <p className="text-muted-foreground">
              {config.description} in the {config.name}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Welcome, {userProfile?.name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {userProfile?.role?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
          <Suspense fallback={<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>}>
            <LazyCreateParishAccountModal diocese={diocese} trigger={
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm shadow hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" /> Add Parish Account
              </button>
            } />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

// Mobile Menu Component
const MobileMenu: React.FC<{
  diocese: Diocese;
  userProfile: { name?: string; role?: string } | null;
  onClose: () => void;
}> = ({ diocese, userProfile, onClose }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 py-6">
        <div className="space-y-6">
          {/* User Profile Section */}
          <div className="px-4 py-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-medium">
                  {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium">{userProfile?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.role?.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </h3>
            
            <Suspense fallback={<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>}>
              <LazyCreateParishAccountModal diocese={diocese} trigger={
                <button
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  onClick={onClose}
                >
                  <Plus className="w-5 h-5 text-primary" />
                  <span>Add Parish Account</span>
                </button>
              } />
            </Suspense>
            
            <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
              <Bell className="w-5 h-5 text-primary" />
              <span>Notifications</span>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
              <Settings className="w-5 h-5 text-primary" />
              <span>Settings</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Navigation
            </h3>
            
            {[
              { name: 'Dashboard', href: '/', active: true },
              { name: 'Churches', href: '/churches' },
              { name: 'Reports', href: '/reports' },
              { name: 'Settings', href: '/settings' },
            ].map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`block p-3 rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={onClose}
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 pb-6 px-4">
        <p className="text-xs text-muted-foreground text-center">
          VISITA Church Management System
        </p>
        <p className="text-xs text-muted-foreground text-center mt-1">
          Diocese of {diocese === 'tagbilaran' ? 'Tagbilaran' : 'Talibon'}
        </p>
      </div>
    </div>
  );
};

export default MobileHeader;