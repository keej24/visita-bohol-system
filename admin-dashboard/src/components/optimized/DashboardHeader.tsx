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
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {config.name}
            </h1>
            <p className="text-sm text-gray-600">
              Welcome, {userProfile?.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
