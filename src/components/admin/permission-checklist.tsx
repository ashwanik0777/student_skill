"use client";

import { Check } from "lucide-react";
import { PERMISSION_GROUPS, PERMISSION_KEYS, PERMISSIONS, type Permission } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";

/** Applies implied permissions: granting "manage" grants "view"; removing "view" removes what depends on it. */
export function togglePermission(current: Permission[], key: Permission, on: boolean): Permission[] {
  const set = new Set(current);
  if (on) {
    set.add(key);
    const def = PERMISSIONS[key];
    if ("requires" in def) for (const r of def.requires) set.add(r);
  } else {
    set.delete(key);
    for (const k of PERMISSION_KEYS) {
      const def = PERMISSIONS[k];
      if ("requires" in def && (def.requires as readonly string[]).includes(key)) set.delete(k);
    }
  }
  return PERMISSION_KEYS.filter((k) => set.has(k));
}

/** Grouped permission picker. Renders real checkboxes named `name`, so it also works inside a <form>. */
export function PermissionChecklist({
  name = "permissions",
  value,
  onChange,
  allowed,
}: {
  name?: string;
  value: Permission[];
  onChange: (next: Permission[]) => void;
  /** Permissions the current staff member may grant; the rest are shown disabled. */
  allowed?: Permission[];
}) {
  const grantableKeys = allowed ?? PERMISSION_KEYS;
  const all = grantableKeys.every((k) => value.includes(k));
  return (
    <fieldset>
      <div className="mb-2 flex items-center justify-between">
        <legend className="text-sm font-medium">Permissions</legend>
        <button
          type="button"
          onClick={() => onChange(all ? [] : [...grantableKeys])}
          className="text-xs font-medium text-brand-ink hover:underline"
        >
          {all ? "Clear all" : "Select all"}
        </button>
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-border bg-background p-3 scrollbar-thin">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.group}>
            <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.group}</p>
            <ul className="space-y-1">
              {group.keys.map((key) => {
                const checked = value.includes(key);
                const locked = !grantableKeys.includes(key);
                return (
                  <li key={key}>
                    <label
                      title={locked ? "You don't hold this permission, so you can't grant it." : undefined}
                      className={cn(
                        "flex items-start gap-3 rounded-lg px-2 py-2 transition-colors",
                        locked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-surface-2",
                        checked && !locked && "bg-brand-soft/60 hover:bg-brand-soft",
                      )}
                    >
                      <input
                        type="checkbox"
                        name={name}
                        value={key}
                        disabled={locked}
                        checked={checked}
                        onChange={(e) => onChange(togglePermission(value, key, e.target.checked))}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                          checked ? "border-brand bg-brand text-white" : "border-border-strong bg-surface",
                        )}
                      >
                        {checked && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{PERMISSIONS[key].label}</span>
                        <span className="block text-[13px] leading-snug text-muted-foreground">{PERMISSIONS[key].description}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
