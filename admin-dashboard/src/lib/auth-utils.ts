import { UserRole, Diocese } from '@/contexts/AuthContext';

interface KnownAccountProfile {
  name: string;
  role: UserRole;
  diocese: Diocese;
}

export function getKnownAccountProfile(email: string): KnownAccountProfile | null {
  const knownAccounts: Record<string, KnownAccountProfile> = {
    'dioceseoftagbilaran@gmail.com': {
      name: 'Tagbilaran Chancery Office',
      role: 'chancery_office',
      diocese: 'tagbilaran',
    },
    'talibonchancery@gmail.com': {
      name: 'Talibon Chancery Office',
      role: 'chancery_office',
      diocese: 'talibon',
    },
    'researcher.heritage@museum.ph': {
      name: 'Museum Researcher',
      role: 'museum_researcher',
      diocese: 'tagbilaran',
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
