import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../config";

export interface PublicStaticPage {
  slug: string;
  title: string;
  body: string;
}

export interface PublicPlatformSettings {
  platform_name: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  social_links: Record<string, string>;
  show_map: boolean;
  show_services: boolean;
  show_volunteering: boolean;
  pages: PublicStaticPage[];
}

const FALLBACK: PublicPlatformSettings = {
  platform_name: "تكافل وأثر",
  logo_url: "",
  contact_email: "info@takafol-athar.com",
  contact_phone: "+966 50 123 4567",
  address: "القصيم، المملكة العربية السعودية",
  social_links: {},
  show_map: true,
  show_services: true,
  show_volunteering: true,
  pages: [],
};

const STORAGE_KEY = "takaful_public_settings_v2";

function loadCached(): PublicPlatformSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PublicPlatformSettings) : null;
  } catch {
    return null;
  }
}

interface Ctx {
  settings: PublicPlatformSettings;
  loading: boolean;
  reload: () => Promise<void>;
  applyPublicSettings: (next: Partial<PublicPlatformSettings>) => void;
  pageBySlug: (slug: string) => PublicStaticPage | undefined;
}

const PlatformSettingsContext = createContext<Ctx | undefined>(undefined);

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicPlatformSettings>(() => loadCached() || FALLBACK);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/public-settings/`);
      if (!res.ok) throw new Error("fetch");
      const data = (await res.json()) as PublicPlatformSettings;
      const merged = { ...FALLBACK, ...data, pages: data.pages || [] };
      setSettings(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      setSettings((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const applyPublicSettings = useCallback((next: Partial<PublicPlatformSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      return merged;
    });
  }, []);

  const pageBySlug = useCallback(
    (slug: string) => settings.pages.find((p) => p.slug === slug),
    [settings.pages],
  );

  const value = useMemo(
    () => ({ settings, loading, reload, applyPublicSettings, pageBySlug }),
    [settings, loading, reload, applyPublicSettings, pageBySlug],
  );

  return <PlatformSettingsContext.Provider value={value}>{children}</PlatformSettingsContext.Provider>;
}

export function usePlatformSettings(): Ctx {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) throw new Error("usePlatformSettings must be used within PlatformSettingsProvider");
  return ctx;
}
