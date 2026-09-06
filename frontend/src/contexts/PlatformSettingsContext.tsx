import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../config";

export interface PublicStaticPage {
  slug: string;
  title: string;
  body: string;
}

export type DonorDataPolicy = "none" | "name_optional" | "full";

export interface RolesCanLogin {
  admin: boolean;
  manager: boolean;
  employee: boolean;
  user: boolean;
  donor: boolean;
  supplier: boolean;
  representative: boolean;
  beneficiary: boolean;
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
  roles_can_login: RolesCanLogin;
  sponsorship_payments_enabled: boolean;
  sponsorship_gps_documentation: boolean;
  sponsorship_collect_donor_data: DonorDataPolicy;
  pages: PublicStaticPage[];
}

const DEFAULT_ROLES: RolesCanLogin = {
  admin: true,
  manager: true,
  employee: true,
  user: true,
  donor: false,
  supplier: false,
  representative: false,
  beneficiary: false,
};

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
  roles_can_login: { ...DEFAULT_ROLES },
  sponsorship_payments_enabled: false,
  sponsorship_gps_documentation: false,
  sponsorship_collect_donor_data: "name_optional",
  pages: [],
};

const STORAGE_KEY = "takaful_public_settings_v3";

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
      const merged: PublicPlatformSettings = {
        ...FALLBACK,
        ...data,
        roles_can_login: { ...DEFAULT_ROLES, ...(data.roles_can_login || {}) },
        pages: data.pages || [],
      };
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
      const merged: PublicPlatformSettings = {
        ...prev,
        ...next,
        roles_can_login: {
          ...prev.roles_can_login,
          ...(next.roles_can_login || {}),
        },
      };
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
