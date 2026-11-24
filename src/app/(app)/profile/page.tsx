import { ArrowRight, Award, CalendarDays, ClipboardList, Flame, GraduationCap, Mail, MapPin, School, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { SignOutButton } from "@/components/profile/sign-out-button";
import { ThemeSegmented } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getStats } from "@/lib/services/analytics";
import { getBadgeContext } from "@/lib/services/badges";
import { Button } from "@/components/ui/button";
import { requireLearner } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile & settings" />
      <Suspense fallback={<PageSkeleton />}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  const { user, config } = await requireLearner();
  const [stats, { owned }] = await Promise.all([getStats(user.id), getBadgeContext(user.id, { key: config.key, subjectCount: config.subjects.length })]);

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <Avatar name={user.name} src={user.image} size="xl" />
            <h2 className="mt-4 text-xl font-bold tracking-tight">{user.name}</h2>
            <p className="text-sm text-muted-foreground">
              Level {stats.level.level} · {stats.level.title}
            </p>
            <ul className="mt-5 w-full space-y-2.5 text-left text-sm">
              <li className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="size-4 shrink-0" /> <span className="min-w-0 truncate">{user.email}</span>
              </li>
              {user.school && (
                <li className="flex items-center gap-2.5 text-muted-foreground">
                  <School className="size-4 shrink-0" /> <span className="min-w-0 truncate">{user.school}</span>
                </li>
              )}
              {(user.city || user.state) && (
                <li className="flex items-center gap-2.5 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" /> {[user.city, user.state].filter(Boolean).join(", ")}
                </li>
              )}
              <li className="flex items-center gap-2.5 text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" /> Joined {formatDate(user.createdAt, { month: "long", year: "numeric", day: undefined })}
              </li>
            </ul>
            <div className="mt-6 grid w-full grid-cols-2 gap-2">
              {[
                { icon: Zap, label: "XP", value: stats.xp.toLocaleString("en-IN") },
                { icon: ClipboardList, label: "Tests", value: stats.testsCompleted },
                { icon: Flame, label: "Best streak", value: `${stats.longestStreak}d` },
                { icon: Award, label: "Badges", value: owned.size },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-surface-2 p-3 text-left">
                  <s.icon className="size-4 text-muted-foreground" />
                  <p className="mt-1.5 font-semibold tabular">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <Link href="/achievements" className="mt-4 text-sm font-medium text-brand-ink hover:underline">
              View achievements
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                <GraduationCap className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">My course</p>
                <p className="font-semibold">{config.label}</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/course">
                Manage course <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <SectionHeading title="Personal details" />
            <ProfileForm defaults={user} schoolRequired={user.trackKind === "school"} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <SectionHeading title="Appearance" />
            <ThemeSegmented />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Account</h3>
              <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
            </div>
            <SignOutButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
