import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import type { Diocese } from '@/contexts/AuthContext';

interface DashboardHeaderProps {
  diocese: Diocese;
  userProfile: {
    name?: string;
    role?: string;
  } | null;
}

const dioceseConfig = {
  tagbilaran: {
    name: 'Tagbilaran Diocese',
    description: 'Chancery Office Dashboard',
  },
  talibon: {
    name: 'Talibon Diocese', 
    description: 'Chancery Office Dashboard',
  },
};

export const DashboardHeader = React.memo<DashboardHeaderProps>(({ diocese, userProfile }) => {
  const config = dioceseConfig[diocese];

  return (
    <div className="bg-white border rounded-lg p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
              {config.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              Welcome, {userProfile?.name || 'Administrator'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';