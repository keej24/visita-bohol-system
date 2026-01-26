import { UserRole, Diocese } from '@/contexts/AuthContext';

interface KnownAccountProfile {
  name: string;
  role: UserRole;
  diocese: Diocese;
}

// Username to email mapping for admin users
// This allows admin users to log in with a simple username instead of email
const usernameToEmailMap: Record<string, string> = {
  // Chancery Office accounts
  'tagbilaran_chancery': 'dioceseoftagbilaran1941@gmail.com',
  'talibon_chancery': 'talibonchancery@gmail.com',
  // Museum Researcher account
  'museum_researcher': 'bohol@nationalmuseum.gov.ph',
};

/**
 * Resolve a username or email to the actual email address
 * If input contains '@', it's treated as an email and returned as-is
 * Otherwise, it's looked up in the username mapping
 */
export function resolveUsernameToEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  
  // If it contains @, it's already an email
  if (trimmed.includes('@')) {
    return trimmed;
  }
  
  // Look up in username map
  const email = usernameToEmailMap[trimmed];
  if (email) {
    return email;
  }
  
  // Return as-is (will fail auth if not valid)
  return trimmed;
}

/**
 * Check if an input is a valid admin username
 */
export function isValidAdminUsername(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  return trimmed in usernameToEmailMap;
}

/**
 * Get display name for a username (for UI hints)
 */
export function getUsernameDisplayName(username: string): string | null {
  const email = usernameToEmailMap[username.trim().toLowerCase()];
  if (email) {
    const profile = getKnownAccountProfile(email);
    return profile?.name || null;
  }
  return null;
}

export function getKnownAccountProfile(email: string): KnownAccountProfile | null {
  const knownAccounts: Record<string, KnownAccountProfile> = {
    'dioceseoftagbilaran1941@gmail.com': {
      name: 'Tagbilaran Chancery Office',
      role: 'chancery_office',
      diocese: 'tagbilaran',
    },
    'talibonchancery@gmail.com': {
      name: 'Talibon Chancery Office',
      role: 'chancery_office',
      diocese: 'talibon',
    },
    'bohol@nationalmuseum.gov.ph': {
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
    'dioceseoftagbilaran1941@gmail.com',
    'talibonchancery@gmail.com',
    'bohol@nationalmuseum.gov.ph'
  ];
  return preconfiguredEmails.includes(email);
}
