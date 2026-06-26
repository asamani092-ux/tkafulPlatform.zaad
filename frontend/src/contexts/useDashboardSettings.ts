import { useContext } from 'react';
import { DashboardSettingsContext, type DashboardSettingsContextType } from './DashboardSettingsContext';

export function useDashboardSettings(): DashboardSettingsContextType {
    const ctx = useContext(DashboardSettingsContext);
    if (!ctx) throw new Error('useDashboardSettings must be used within DashboardSettingsProvider');
    return ctx;
}
