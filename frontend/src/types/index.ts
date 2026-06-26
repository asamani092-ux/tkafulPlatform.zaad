// Common types used across the application

export type Stat = { 
  label: string; 
  value: string; 
};

// Home page service type (simplified)
export type HomeService = { 
  id: string; 
  title: string; 
  desc: string; 
  ctaLabel: string; 
  href: string; 
};

// Detailed service type for services page
export type Service = {
  id: string | number;
  title: string;
  desc: string;
  status: "متاحة" | "قادمة" | "مكتملة";
  service_type: "للمستفيدين" | "للمتطوعين";
  is_active?: boolean;
  created_at?: string;
  category?: string;
  beneficiaries?: number;
  date?: string;
  location?: string;
  org?: string;
  icon?: string;
  details?: {
    summary: string;
    meta?: { label: string; value: string; icon?: string }[];
    audiences?: string[];
    requirements?: string[];
    steps?: { title: string; desc: string; icon?: string }[];
    contact?: { name: string; phone: string; email: string };
    volunteers?: { need: number; current: number };
  };
};

export type Project = {
  id: string;
  category: "أساسي" | "مجتمعي" | "مؤسسي";
  title: string;
  desc: string;
  beneficiaries: number;
  status: "منشور" | "مغلق";
  location: string;
  details?: {
    summary: string;
    includes: string[];
    audiences: string[];
    requirements: string[];
  };
};
