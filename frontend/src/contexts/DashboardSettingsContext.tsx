import React, { createContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'dashboardSettings';
const LEGACY_STORAGE_KEY = 'takaful:dashboardSettings';

export interface DashboardSettings {
    showDashboard: boolean;
    showKPIs: boolean;
    showTopVolunteers: boolean;
    showDonut: boolean;
    showVolunteerBars: boolean;
    year: number;
    [key: string]: any;
}

export type DashboardSettingsContextType = {
    settings: DashboardSettings;
    updateSetting: <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => void;
};

export const DashboardSettingsContext = createContext<DashboardSettingsContextType | undefined>(undefined);

function getDefaultSettings(): DashboardSettings {
    return {
        showDashboard: true,
        showKPIs: true,
        showTopVolunteers: true,
        showDonut: true,
        showVolunteerBars: true,
        year: new Date().getFullYear(),
    };
}

export const DashboardSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<DashboardSettings>(getDefaultSettings());
    const [hydrated, setHydrated] = useState(false);

    // Load once on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<DashboardSettings>;
                setSettings((prev) => ({ ...prev, ...parsed }));
            } else if (legacyRaw) {
                const parsed = JSON.parse(legacyRaw) as Partial<DashboardSettings>;
                const merged = { ...getDefaultSettings(), ...parsed };
                setSettings(merged);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            }
        } catch {
            setSettings(getDefaultSettings());
        } finally {
            setHydrated(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist after hydration when settings change
    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // Silently fail if localStorage is not available
        }
    }, [settings, hydrated]);

    const updateSetting = <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <DashboardSettingsContext.Provider value={{ settings, updateSetting }}>
            {children}
        </DashboardSettingsContext.Provider>
    );
};
