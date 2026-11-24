import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { containerClass } from "@/components/ui/container";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#courses", label: "Courses" },
      { href: "/#how", label: "How it works" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/practice", label: "AI practice" },
      { href: "/tutor", label: "AI tutor" },
      { href: "/community", label: "Doubt forum" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/sign-up", label: "Create account" },
      { href: "/sign-in", label: "Sign in" },
      { href: "/offline", label: "Offline tests" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className={cn(containerClass, "grid gap-10 py-14 sm:grid-cols-3 lg:grid-cols-[1.6fr_repeat(3,1fr)]")}>
        <div className="max-w-sm sm:col-span-3 lg:col-span-1">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{SITE.description}</p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <h3 className="font-sans text-sm font-semibold tracking-normal">{c.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className={cn(containerClass, "flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between")}>
          <p>© {SITE.name}. Built for students preparing for board and entrance exams.</p>
          <p>CBSE · ICSE/ISC · UP Board · Bihar Board · JEE · NEET · CUET · NDA</p>
        </div>
      </div>
    </footer>
  );
}
