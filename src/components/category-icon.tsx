import { CATEGORY_META } from "@/lib/constants";
import type { ExpenseCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  BriefcaseBusiness,
  Clapperboard,
  Fuel,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Lightbulb,
  Package,
  PawPrint,
  Plane,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Tv,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  Food: Utensils,
  Groceries: ShoppingCart,
  Fuel,
  Travel: Plane,
  Shopping: ShoppingBag,
  Entertainment: Clapperboard,
  EMI: Landmark,
  Rent: House,
  Utilities: Lightbulb,
  Insurance: ShieldCheck,
  Medical: HeartPulse,
  Education: GraduationCap,
  Investment: TrendingUp,
  Subscriptions: Tv,
  Pets: PawPrint,
  Family: Users,
  "Personal Care": Sparkles,
  Business: BriefcaseBusiness,
  Other: Package,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: ExpenseCategory;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon className={cn("h-4 w-4", className)} style={{ color: CATEGORY_META[category].color }} />;
}