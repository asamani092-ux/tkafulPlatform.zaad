// FIX: Centralized icon imports to optimize bundle size and enable tree-shaking
import {
  Users,
  CalendarDays,
  MapPin,
  HandHeart,
  Lightbulb,
  Droplets,
  Stethoscope,
  Ambulance,
  ChevronLeft,
  Shield,
  X,
  Check,
  AlertCircle,
  Info,
  ShoppingBag,
  Heart,
  Home,
  Shirt,
  BookOpen,
  Accessibility,
  TreePine,
  Clock,
  CheckCircle,
  Award
} from 'lucide-react';

// FIX: Icon mapping to enable dynamic icon loading
export const iconMap = {
  Users,
  CalendarDays,
  MapPin,
  HandHeart,
  Lightbulb,
  Droplets,
  Stethoscope,
  Ambulance,
  ChevronLeft,
  Shield,
  X,
  Check,
  AlertCircle,
  Info,
  ShoppingBag,
  Heart,
  Home,
  Shirt,
  BookOpen,
  Accessibility,
  TreePine,
  Clock,
  CheckCircle,
  Award
} as const;

export type IconName = keyof typeof iconMap;
