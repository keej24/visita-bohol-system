// Auth utility functions for preconfigured accounts

export interface KnownAccount {
  email: string;
  role: 'chancery' | 'parish' | 'museum_researcher';
  diocese: 'tagbilaran' | 'talibon';
  displayName: string;
  parish?: string;
}

// Preconfigured test/demo accounts
const KNOWN_ACCOUNTS: Record<string, KnownAccount> = {
  'chancery.tagbilaran@visita.com': {
    email: 'chancery.tagbilaran@visita.com',
    role: 'chancery',
    diocese: 'tagbilaran',
    displayName: 'Chancery Office - Tagbilaran'
  },
  'chancery.talibon@visita.com': {
    email: 'chancery.talibon@visita.com',
    role: 'chancery',
    diocese: 'talibon',
    displayName: 'Chancery Office - Talibon'
  },
  'museum@visita.com': {
    email: 'museum@visita.com',
    role: 'museum_researcher',
    diocese: 'tagbilaran',
    displayName: 'Museum Researcher'
  }
};

export function getKnownAccountProfile(email: string): KnownAccount | null {
  return KNOWN_ACCOUNTS[email.toLowerCase()] || null;
}

export function isPreconfiguredAccount(email: string): boolean {
  return email.toLowerCase() in KNOWN_ACCOUNTS;
}
