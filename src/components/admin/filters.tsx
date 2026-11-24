"use client";

import { Search, X } from "lucide-react";
import Form from "next/form";
import { useRef } from "react";
import { Input, Select } from "@/components/ui/input";

export type FilterSelect = { name: string; label: string; value?: string; options: { value: string; label: string }[] };

/**
 * GET filter bar: search box + selects that apply as soon as they change. Uses next/form, so filtering is a
 * client-side navigation that keeps the layout (and works as a plain form without JavaScript).
 */
export function FilterBar({
  action,
  search,
  selects,
  hidden,
}: {
  action: string;
  search?: { name: string; placeholder: string; value?: string };
  selects: FilterSelect[];
  /** Values to keep when the filters change (e.g. the active tab). */
  hidden?: Record<string, string | undefined>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <Form ref={formRef} action={action} className="mb-5 flex flex-col gap-2.5 md:flex-row md:items-center" role="search">
      {Object.entries(hidden ?? {}).map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
      {search && (
        <div className="relative md:max-w-sm md:flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name={search.name}
            defaultValue={search.value}
            placeholder={search.placeholder}
            aria-label={search.placeholder}
            className="pl-10 pr-9"
            type="search"
          />
          {search.value && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                const input = formRef.current?.elements.namedItem(search.name) as HTMLInputElement | null;
                if (input) input.value = "";
                formRef.current?.requestSubmit();
              }}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
        {selects.map((s) => (
          <Select
            key={s.name}
            name={s.name}
            defaultValue={s.value ?? ""}
            aria-label={s.label}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="sm:w-auto sm:min-w-40"
          >
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ))}
      </div>
      <button type="submit" className="sr-only">
        Apply filters
      </button>
    </Form>
  );
}
