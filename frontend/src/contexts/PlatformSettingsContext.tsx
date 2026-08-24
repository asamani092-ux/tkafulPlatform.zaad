import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../config";

/** إعدادات المنصّة العامة — تُجلب من الخادم مع fallback لمتغيرات البناء. */
export interface PublicPlatformSettings {
  water_supply_form_enabled: boolean;
  public_registration_enabled: boolean;
  maintenance_mode: boolean;
  contact_email: string;
  contact_phone: string;
}

const STORAGE_KEY = "takaful_public_settings_v1";

const BUILD_DEFAULTS: PublicPlatformSettings = {
  water_supply_form_enabled: import.meta.env.VITE_ENABLE_WATER_SUPPLY_FORM !== "false",
  public_registration_enabled: true,
  maintenance_mode: false,
  contact_email: "info@takafol-athar.com",
  contact_phone: "+966 50 123 4567",
};

function loadCached(): PublicPlatformSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PublicPlatformSettings) : null;
  } catch {
    return null;
  }
}

interface PlatformSettingsContextValue {
  settings: PublicPlatformSettings;
  loading: boolean;
  reload: () => Promise<void>;
  /** تحديث محلي بعد حفظ المشرف — O(1) */
  applyPublicSettings: (next: Partial<PublicPlatformSettings>) => void;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextValue | undefined>(undefined);

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicPlatformSettings>(() => loadCached() || BUILD_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/public-settings/`);
      if (!res.ok) throw new Error("fetch");
      const data = (await res.json()) as PublicPlatformSettings;
      setSettings({ ...BUILD_DEFAULTS, ...data });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...BUILD_DEFAULTS, ...data }));
    } catch {
      setSettings((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const applyPublicSettings = useCallback((next: Partial<PublicPlatformSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch { /* ignore */ }
      return merged;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, loading, reload, applyPublicSettings }),
    [settings, loading, reload, applyPublicSettings],
  );

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings(): PlatformSettingsContextValue {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) {
    throw new Error("usePlatformSettings must be used within PlatformSettingsProvider");
  }
  return ctx;
}

/** للمكوّنات خارج المزوّد — fallback آمن */
export function usePlatformSettingsOptional(): PlatformSettingsContextValue | null {
  return useContext(PlatformSettingsContext) ?? null;
}
