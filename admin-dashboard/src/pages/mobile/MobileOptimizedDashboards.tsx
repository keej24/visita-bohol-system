import React from 'react';
import { MobileResponsiveDashboard } from '@/components/mobile/MobileResponsiveDashboard';
import type { Diocese } from '@/contexts/AuthContext';

// Mobile-optimized versions of the diocese dashboards
export const MobileTagbilaranDashboard = () => {
  return <MobileResponsiveDashboard diocese="tagbilaran" />;
};

export const MobileTalibonDashboard = () => {
  return <MobileResponsiveDashboard diocese="talibon" />;
};

// Adaptive dashboard that chooses between desktop and mobile based on screen size
export const AdaptiveDashboard: React.FC<{ diocese: Diocese }> = ({ diocese }) => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return <MobileResponsiveDashboard diocese={diocese} />;
};

export default AdaptiveDashboard;
