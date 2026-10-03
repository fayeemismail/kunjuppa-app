import { create } from 'zustand';
import { BusinessSettings } from '@/types';
import { storage } from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/seedData';

interface SettingsState {
  settings: BusinessSettings;
  isLoaded: boolean;
  loadSettings: () => void;
  updateSettings: (newSettings: Partial<BusinessSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: () => {
    storage.initializeSeedData();
    const stored = storage.getSettings();
    set({ settings: stored, isLoaded: true });
  },

  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    storage.setSettings(updated);
    set({ settings: updated });
  },

  resetSettings: () => {
    storage.setSettings(DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },
}));
