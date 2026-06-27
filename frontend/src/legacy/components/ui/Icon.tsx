import { 
  HandHeart, 
  Lightbulb, 
  Droplets, 
  Ambulance, 
  Stethoscope, 
  Users, 
  MapPin, 
  CalendarDays,
  Clock,
  User,
  ChevronLeft,
  ShoppingBag,
  Heart,
  Home,
  Shirt,
  BookOpen,
  Accessibility,
  TreePine,
  Building,
  ArrowRight,
  Star,
  X,
  LogOut,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Check,
  AlertCircle,
  Info,
  CheckCircle2,
  Rocket,
  ClipboardList,
  Camera,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

const iconMap: Record<string, LucideIcon> = {
  HandHeart,
  Lightbulb,
  Droplets,
  Ambulance,
  Stethoscope,
  Users,
  MapPin,
  CalendarDays,
  Clock,
  User,
  ChevronLeft,
  ShoppingBag,
  Heart,
  Home,
  Shirt,
  BookOpen,
  Accessibility,
  TreePine,
  Building,
  ArrowRight,
  Star,
  X,
  LogOut,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Check,
  AlertCircle,
  Info,
  CheckCircle2,
  Rocket,
  ClipboardList,
  Camera,
};

export default function Icon({ name, className = '', size = 24, style }: IconProps) {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  return <IconComponent className={className} size={size} style={style} aria-hidden="true" />;
}
