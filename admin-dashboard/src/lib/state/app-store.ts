import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// Types for application state
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'chancery_office' | 'parish_secretary' | 'museum_researcher' | 'admin';
  diocese: 'tagbilaran' | 'talibon';
  permissions: string[];
  isActive: boolean;
  lastLogin: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'fil';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    autoRefresh: boolean;
    refreshInterval: number;
    defaultView: 'grid' | 'table' | 'card';
    itemsPerPage: number;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
  };
}

export interface AppSettings {
  isOnline: boolean;
  isMaintenance: boolean;
  lastSync: Date | null;
  version: string;
  features: {
    realTimeUpdates: boolean;
    offlineMode: boolean;
    betaFeatures: boolean;
  };
}

export interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
}

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'destructive';
}

export interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobile: boolean;
  activeModal: string | null;
  activeSheet: string | null;
  loadingStates: Record<string, boolean>;
  selectedItems: Record<string, string[]>;
  filters: Record<string, any>;
  sortOptions: Record<string, { field: string; direction: 'asc' | 'desc' }>;
}

// Main application store interface
export interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // App settings
  settings: AppSettings;
  
  // UI state
  ui: UIState;
  
  // Notifications
  notifications: NotificationState;
  
  // Actions
  setUser: (user: User | null) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  logout: () => void;
  
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleFeature: (feature: keyof AppSettings['features']) => void;
  
  // UI actions
  toggleSidebar: () => void;
  setSidebarMobile: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  openSheet: (sheetId: string) => void;
  closeSheet: () => void;
  setLoading: (key: string, loading: boolean) => void;
  selectItem: (collection: string, itemId: string) => void;
  deselectItem: (collection: string, itemId: string) => void;
  clearSelection: (collection: string) => void;
  updateFilters: (collection: string, filters: any) => void;
  updateSort: (collection: string, field: string, direction?: 'asc' | 'desc') => void;
  
  // Notification actions
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => void;
  markNotificationRead: (notificationId: string) => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  
  // Batch actions
  reset: () => void;
  hydrate: (data: Partial<AppState>) => void;
}

// Default state values
const defaultUserPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  dashboard: {
    autoRefresh: true,
    refreshInterval: 30000,
    defaultView: 'table',
    itemsPerPage: 20,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
  },
};

const defaultSettings: AppSettings = {
  isOnline: navigator.onLine,
  isMaintenance: false,
  lastSync: null,
  version: '1.0.0',
  features: {
    realTimeUpdates: true,
    offlineMode: false,
    betaFeatures: false,
  },
};

const defaultUIState: UIState = {
  sidebarCollapsed: false,
  sidebarMobile: false,
  activeModal: null,
  activeSheet: null,
  loadingStates: {},
  selectedItems: {},
  filters: {},
  sortOptions: {},
};

const defaultNotificationState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
};

// Create the main application store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          user: null,
          isAuthenticated: false,
          isLoading: false,
          settings: defaultSettings,
          ui: defaultUIState,
          notifications: defaultNotificationState,

          // User actions
          setUser: (user) => {
            set((state) => {
              state.user = user;
              state.isAuthenticated = !!user;
              state.isLoading = false;
              
              if (user) {
                state.settings.lastSync = new Date();
              }
            });
          },

          updateUserPreferences: (preferences) => {
            set((state) => {
              if (state.user) {
                state.user.preferences = {
                  ...state.user.preferences,
                  ...preferences,
                };
              }
            });
          },

          logout: () => {
            set((state) => {
              state.user = null;
              state.isAuthenticated = false;
              state.ui = defaultUIState;
              state.notifications = defaultNotificationState;
            });
          },

          // Settings actions
          updateSettings: (settings) => {
            set((state) => {
              state.settings = { ...state.settings, ...settings };
            });
          },

          toggleFeature: (feature) => {
            set((state) => {
              state.settings.features[feature] = !state.settings.features[feature];
            });
          },

          // UI actions
          toggleSidebar: () => {
            set((state) => {
              state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
            });
          },

          setSidebarMobile: (open) => {
            set((state) => {
              state.ui.sidebarMobile = open;
            });
          },

          openModal: (modalId) => {
            set((state) => {
              state.ui.activeModal = modalId;
            });
          },

          closeModal: () => {
            set((state) => {
              state.ui.activeModal = null;
            });
          },

          openSheet: (sheetId) => {
            set((state) => {
              state.ui.activeSheet = sheetId;
            });
          },

          closeSheet: () => {
            set((state) => {
              state.ui.activeSheet = null;
            });
          },

          setLoading: (key, loading) => {
            set((state) => {
              if (loading) {
                state.ui.loadingStates[key] = true;
              } else {
                delete state.ui.loadingStates[key];
              }
            });
          },

          selectItem: (collection, itemId) => {
            set((state) => {
              if (!state.ui.selectedItems[collection]) {
                state.ui.selectedItems[collection] = [];
              }
              if (!state.ui.selectedItems[collection].includes(itemId)) {
                state.ui.selectedItems[collection].push(itemId);
              }
            });
          },

          deselectItem: (collection, itemId) => {
            set((state) => {
              if (state.ui.selectedItems[collection]) {
                state.ui.selectedItems[collection] = state.ui.selectedItems[collection].filter(
                  (id) => id !== itemId
                );
              }
            });
          },

          clearSelection: (collection) => {
            set((state) => {
              state.ui.selectedItems[collection] = [];
            });
          },

          updateFilters: (collection, filters) => {
            set((state) => {
              state.ui.filters[collection] = filters;
            });
          },

          updateSort: (collection, field, direction = 'asc') => {
            set((state) => {
              state.ui.sortOptions[collection] = { field, direction };
            });
          },

          // Notification actions
          addNotification: (notification) => {
            set((state) => {
              const newNotification: AppNotification = {
                ...notification,
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date(),
                isRead: false,
              };
              
              state.notifications.notifications.unshift(newNotification);
              state.notifications.unreadCount += 1;
              
              // Keep only last 50 notifications
              if (state.notifications.notifications.length > 50) {
                state.notifications.notifications = state.notifications.notifications.slice(0, 50);
              }
            });
          },

          markNotificationRead: (notificationId) => {
            set((state) => {
              const notification = state.notifications.notifications.find(
                (n) => n.id === notificationId
              );
              if (notification && !notification.isRead) {
                notification.isRead = true;
                state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
              }
            });
          },

          removeNotification: (notificationId) => {
            set((state) => {
              const index = state.notifications.notifications.findIndex(
                (n) => n.id === notificationId
              );
              if (index > -1) {
                const notification = state.notifications.notifications[index];
                if (!notification.isRead) {
                  state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
                }
                state.notifications.notifications.splice(index, 1);
              }
            });
          },

          clearAllNotifications: () => {
            set((state) => {
              state.notifications.notifications = [];
              state.notifications.unreadCount = 0;
            });
          },

          // Utility actions
          reset: () => {
            set(() => ({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              settings: defaultSettings,
              ui: defaultUIState,
              notifications: defaultNotificationState,
            }));
          },

          hydrate: (data) => {
            set((state) => {
              Object.assign(state, data);
            });
          },
        }))
      ),
      {
        name: 'visita-app-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          settings: state.settings,
          ui: {
            sidebarCollapsed: state.ui.sidebarCollapsed,
            filters: state.ui.filters,
            sortOptions: state.ui.sortOptions,
          },
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          // Handle migrations between versions
          if (version === 0) {
            // Migration from version 0 to 1
            return {
              ...persistedState,
              settings: {
                ...defaultSettings,
                ...persistedState.settings,
              },
            };
          }
          return persistedState;
        },
      }
    ),
    { name: 'visita-store' }
  )
);

// Selectors
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useUserPreferences = () => useAppStore((state) => state.user?.preferences || defaultUserPreferences);
export const useAppSettings = () => useAppStore((state) => state.settings);
export const useUIState = () => useAppStore((state) => state.ui);
export const useNotifications = () => useAppStore((state) => state.notifications);

// Computed selectors
export const useIsLoading = (key?: string) => {
  return useAppStore((state) => {
    if (key) {
      return state.ui.loadingStates[key] || false;
    }
    return Object.keys(state.ui.loadingStates).length > 0;
  });
};

export const useSelectedItems = (collection: string) => {
  return useAppStore((state) => state.ui.selectedItems[collection] || []);
};

export const useFilters = (collection: string) => {
  return useAppStore((state) => state.ui.filters[collection] || {});
};

export const useSortOptions = (collection: string) => {
  return useAppStore((state) => state.ui.sortOptions[collection] || { field: 'updatedAt', direction: 'desc' });
};

export const useUnreadNotificationsCount = () => {
  return useAppStore((state) => state.notifications.unreadCount);
};

// Action hooks
export const useAppActions = () => {
  return useAppStore((state) => ({
    setUser: state.setUser,
    updateUserPreferences: state.updateUserPreferences,
    logout: state.logout,
    updateSettings: state.updateSettings,
    toggleFeature: state.toggleFeature,
  }));
};

export const useUIActions = () => {
  return useAppStore((state) => ({
    toggleSidebar: state.toggleSidebar,
    setSidebarMobile: state.setSidebarMobile,
    openModal: state.openModal,
    closeModal: state.closeModal,
    openSheet: state.openSheet,
    closeSheet: state.closeSheet,
    setLoading: state.setLoading,
    selectItem: state.selectItem,
    deselectItem: state.deselectItem,
    clearSelection: state.clearSelection,
    updateFilters: state.updateFilters,
    updateSort: state.updateSort,
  }));
};

export const useNotificationActions = () => {
  return useAppStore((state) => ({
    addNotification: state.addNotification,
    markNotificationRead: state.markNotificationRead,
    removeNotification: state.removeNotification,
    clearAllNotifications: state.clearAllNotifications,
  }));
};

// Store utilities
export class StoreUtils {
  static subscribe = useAppStore.subscribe;
  static getState = useAppStore.getState;
  static setState = useAppStore.setState;

  // Bulk operations
  static bulkSelectItems(collection: string, itemIds: string[]) {
    const { selectItem } = this.getState();
    itemIds.forEach((id) => selectItem(collection, id));
  }

  static bulkDeselectItems(collection: string, itemIds: string[]) {
    const { deselectItem } = this.getState();
    itemIds.forEach((id) => deselectItem(collection, id));
  }

  // Theme utilities
  static applyTheme(theme: 'light' | 'dark' | 'system') {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemPreference === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }

  // Notification utilities
  static showSuccessNotification(title: string, message: string) {
    const { addNotification } = this.getState();
    addNotification({
      type: 'success',
      title,
      message,
    });
  }

  static showErrorNotification(title: string, message: string) {
    const { addNotification } = this.getState();
    addNotification({
      type: 'error',
      title,
      message,
    });
  }

  // Persistence utilities
  static exportState() {
    const state = this.getState();
    return JSON.stringify({
      user: state.user,
      settings: state.settings,
      ui: {
        sidebarCollapsed: state.ui.sidebarCollapsed,
        filters: state.ui.filters,
        sortOptions: state.ui.sortOptions,
      },
    });
  }

  static importState(jsonState: string) {
    try {
      const state = JSON.parse(jsonState);
      const { hydrate } = this.getState();
      hydrate(state);
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }
}

export default useAppStore;