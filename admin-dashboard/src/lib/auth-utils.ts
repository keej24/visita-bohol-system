import { UserRole, Diocese } from '@/contexts/AuthContext';

interface KnownAccountProfile {
  name: string;
  role: UserRole;
  diocese: Diocese;
  requirePasswordChange?: boolean;
}

export function getKnownAccountProfile(email: string): KnownAccountProfile | null {
  const knownAccounts: Record<string, KnownAccountProfile> = {
    'dioceseoftagbilaran@gmail.com': {
      name: 'Tagbilaran Chancery Office',
      role: 'chancery_office',
      diocese: 'tagbilaran',
      requirePasswordChange: true  // Pre-configured accounts must change password on first login
    },
    'talibonchancery@gmail.com': {
      name: 'Talibon Chancery Office',
      role: 'chancery_office',
      diocese: 'talibon',
      requirePasswordChange: true  // Pre-configured accounts must change password on first login
    },
    'researcher.heritage@museum.ph': {
      name: 'Museum Researcher',
      role: 'museum_researcher',
      diocese: 'tagbilaran',
      requirePasswordChange: true  // Pre-configured accounts must change password on first login
    }
  };

  return knownAccounts[email] || null;
}

// Helper function to check if an account is preconfigured (system account)
export function isPreconfiguredAccount(email: string): boolean {
  const preconfiguredEmails = [
    'dioceseoftagbilaran@gmail.com',
    'talibonchancery@gmail.com',
    'researcher.heritage@museum.ph'
  ];
  return preconfiguredEmails.includes(email);
}
