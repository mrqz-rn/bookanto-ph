import {
  AirVent,
  Bike,
  Brush,
  Camera,
  Car,
  Droplets,
  Dumbbell,
  Flower2,
  Hammer,
  Hand,
  PawPrint,
  Scissors,
  Shirt,
  Sofa,
  Sparkles,
  SprayCan,
  Stethoscope,
  Store,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Icons an admin can give a category (categories.icon). Listed one by one so
// only these ship to the browser. Unknown names fall back to a shop icon.
const ICONS: Record<string, LucideIcon> = {
  "air-vent": AirVent,
  bike: Bike,
  brush: Brush,
  camera: Camera,
  car: Car,
  droplets: Droplets,
  dumbbell: Dumbbell,
  "flower-2": Flower2,
  hammer: Hammer,
  hand: Hand,
  "paw-print": PawPrint,
  scissors: Scissors,
  shirt: Shirt,
  sofa: Sofa,
  sparkles: Sparkles,
  "spray-can": SprayCan,
  stethoscope: Stethoscope,
  wrench: Wrench,
  zap: Zap,
};

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Store;
  return <Icon aria-hidden className={className} />;
}
