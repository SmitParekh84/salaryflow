"use client";

import { CATEGORY_META } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import { FALLBACK_CATEGORY_COLOR } from "@/lib/theme";
import type {
  CategoryIconName,
  CustomCategory,
  DefaultExpenseCategory,
  ExpenseCategory,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  BriefcaseBusiness,
  Clapperboard,
  Coffee,
  Fuel,
  Gamepad2,
  Gift,
  Globe2,
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
  Smartphone,
  Sparkles,
  TrendingUp,
  Tv,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<CategoryIconName, LucideIcon> = {
  utensils: Utensils,
  cart: ShoppingCart,
  fuel: Fuel,
  plane: Plane,
  bag: ShoppingBag,
  film: Clapperboard,
  bank: Landmark,
  home: House,
  lightbulb: Lightbulb,
  phone: Smartphone,
  shield: ShieldCheck,
  medical: HeartPulse,
  education: GraduationCap,
  trend: TrendingUp,
  tv: Tv,
  pet: PawPrint,
  users: Users,
  sparkles: Sparkles,
  briefcase: BriefcaseBusiness,
  package: Package,
  globe: Globe2,
  gamepad: Gamepad2,
  gift: Gift,
  coffee: Coffee,
};

const DEFAULT_CATEGORY_ICONS: Record<DefaultExpenseCategory, CategoryIconName> = {
  Food: "utensils",
  Groceries: "cart",
  Fuel: "fuel",
  Travel: "plane",
  Shopping: "bag",
  Entertainment: "film",
  EMI: "bank",
  Rent: "home",
  Utilities: "lightbulb",
  "Mobile & Internet": "phone",
  Insurance: "shield",
  Medical: "medical",
  Education: "education",
  Investment: "trend",
  Subscriptions: "tv",
  Pets: "pet",
  Family: "users",
  "Personal Care": "sparkles",
  Business: "briefcase",
  Other: "package",
};

export const CATEGORY_ICON_OPTIONS: { value: CategoryIconName; label: string }[] = [
  { value: "globe", label: "Web & domain" },
  { value: "cart", label: "Shopping cart" },
  { value: "utensils", label: "Food" },
  { value: "home", label: "Home" },
  { value: "briefcase", label: "Work" },
  { value: "gift", label: "Gift" },
  { value: "gamepad", label: "Gaming" },
  { value: "coffee", label: "Coffee" },
  { value: "plane", label: "Travel" },
  { value: "medical", label: "Health" },
  { value: "education", label: "Education" },
  { value: "package", label: "General" },
];

export function getCategoryColor(
  category: ExpenseCategory,
  customCategories: CustomCategory[] = [],
) {
  const defaultMeta = CATEGORY_META[category as DefaultExpenseCategory];
  return (
    defaultMeta?.color ??
    customCategories.find((item) => item.name === category)?.color ??
    FALLBACK_CATEGORY_COLOR
  );
}

export function CategoryGlyph({ icon, className }: { icon: CategoryIconName; className?: string }) {
  const Icon = ICONS[icon] ?? Package;
  return <Icon className={cn("h-4 w-4", className)} />;
}

export function CategoryIcon({
  category,
  className,
}: {
  category: ExpenseCategory;
  className?: string;
}) {
  const storedCustomCategories = useFinanceStore((state) => state.profile.customCategories);
  const customCategories = storedCustomCategories ?? [];
  const customCategory = customCategories.find((item) => item.name === category);
  const icon =
    customCategory?.icon ?? DEFAULT_CATEGORY_ICONS[category as DefaultExpenseCategory] ?? "package";
  const Icon = ICONS[icon];
  return (
    <Icon
      className={cn("h-4 w-4", className)}
      style={{ color: getCategoryColor(category, customCategories) }}
    />
  );
}
