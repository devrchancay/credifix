import { create } from "zustand";
import { persist } from "zustand/middleware";

type Density = "compact" | "comfortable" | "spacious";

interface NotificationSettings {
  email: boolean;
  push: boolean;
  marketing: boolean;
}

interface PreferencesState {
  // UI Density
  density: Density;
  setDensity: (density: Density) => void;

  // Notification settings
  notifications: NotificationSettings;
  setNotifications: (notifications: Partial<NotificationSettings>) => void;

  // Sidebar collapsed state (persisted)
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Table page size preference
  tablePageSize: number;
  setTablePageSize: (size: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // UI Density
      density: "comfortable",
      setDensity: (density) => set({ density }),

      // Notifications
      notifications: {
        email: true,
        push: true,
        marketing: false,
      },
      setNotifications: (notifications) =>
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        })),

      // Sidebar
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Table
      tablePageSize: 10,
      setTablePageSize: (size) => set({ tablePageSize: size }),
    }),
    {
      name: "user-preferences",
      partialize: (state) => ({
        density: state.density,
        notifications: state.notifications,
        sidebarCollapsed: state.sidebarCollapsed,
        tablePageSize: state.tablePageSize,
      }),
    }
  )
);
