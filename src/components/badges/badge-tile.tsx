import {
  BookOpen,
  Compass,
  Crown,
  Flame,
  Footprints,
  GraduationCap,
  HandHelping,
  Lock,
  MessageCircleQuestion,
  Rocket,
  Star,
  Sun,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { TIER_STYLES, type BadgeDef } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export const BADGE_ICONS: Record<BadgeDef["icon"], LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  target: Target,
  crown: Crown,
  sun: Sun,
  compass: Compass,
  message: MessageCircleQuestion,
  hand: HandHelping,
  graduation: GraduationCap,
  zap: Zap,
  star: Star,
  book: BookOpen,
  rocket: Rocket,
};

export function BadgeIcon({
  badge,
  earned = true,
  size = "md",
  className,
}: {
  badge: BadgeDef;
  earned?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = earned ? BADGE_ICONS[badge.icon] : Lock;
  const tier = TIER_STYLES[badge.tier];
  const box = { sm: "size-10 rounded-xl [&_svg]:size-5", md: "size-14 rounded-2xl [&_svg]:size-7", lg: "size-20 rounded-3xl [&_svg]:size-9" }[size];
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center ring-1",
        box,
        earned ? cn(tier.tile, tier.ring) : "bg-surface-2 text-muted-foreground/60 ring-border",
        className,
      )}
    >
      <Icon aria-hidden />
    </span>
  );
}
