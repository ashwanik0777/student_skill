import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm, Check, FieldWithError } from "@/components/admin/form-dialog";
import { NoAccess } from "@/components/admin/misc";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { saveGeneralAction, saveRulesAction } from "@/lib/actions/catalog";
import { can } from "@/lib/admin/permissions";
import { PROMOTION_TEST_MODE } from "@/lib/catalog/rules";
import { requireStaff } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Suspense
        fallback={
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        }
      >
        <Settings />
      </Suspense>
    </>
  );
}

function MonthDay({ prefix, month, day }: { prefix: string; month: number; day: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
      <Select name={`${prefix}Month`} defaultValue={String(month)} aria-label="Month">
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </Select>
      <Input name={`${prefix}Day`} type="number" min={1} max={31} defaultValue={day} aria-label="Day" />
    </div>
  );
}

async function Settings() {
  const staff = await requireStaff();
  if (!can(staff, "settings.manage")) return <NoAccess permission="settings.manage" />;
  const { rules, general } = await getSettings();

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <Card>
        <CardContent>
          <SectionHeading title="Course changes" />
          <ActionForm action={saveRulesAction} submitLabel="Save rules" confirm={{ title: "Save the course rules?", description: "They apply to every student straight away.", confirmLabel: "Save rules" }}>
            <div className="grid gap-4 sm:grid-cols-3">
              <FieldWithError name="correctionDays" label="Fix-mistake days" hint="After sign-up, change anything.">
                <Input id="correctionDays" name="correctionDays" type="number" min={0} max={90} defaultValue={rules.correctionDays} />
              </FieldWithError>
              <FieldWithError name="minDaysInClass" label="Min days in class" hint="Before moving up.">
                <Input id="minDaysInClass" name="minDaysInClass" type="number" min={0} max={365} defaultValue={rules.minDaysInClass} />
              </FieldWithError>
              <FieldWithError name="examSwitchDays" label="Exam switch days" hint="Cooldown between switches.">
                <Input id="examSwitchDays" name="examSwitchDays" type="number" min={0} max={365} defaultValue={rules.examSwitchDays} />
              </FieldWithError>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldWithError name="windowStartMonth" label="Promotion window opens" hint="India time, every year.">
                <MonthDay prefix="windowStart" month={rules.windowStartMonth} day={rules.windowStartDay} />
              </FieldWithError>
              <FieldWithError name="windowEndMonth" label="Closes (exclusive)" hint="e.g. 1 August = open until 31 July.">
                <MonthDay prefix="windowEnd" month={rules.windowEndMonth} day={rules.windowEndDay} />
              </FieldWithError>
            </div>
            <Check
              name="promotionAlwaysOpen"
              label="Moving up and exam switching always open"
              hint={`Ignores the window and tenure rules — for testing.${PROMOTION_TEST_MODE ? " (Also forced on by PROMOTION_TEST_MODE in .env.)" : ""}`}
              defaultChecked={rules.promotionAlwaysOpen}
            />
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <SectionHeading title="Sign-ups & notices" />
          <ActionForm action={saveGeneralAction} submitLabel="Save" confirm={{ title: "Save sign-up settings?", description: "Switching sign-ups off hides the sign-up form for everyone.", confirmLabel: "Save" }}>
            <Check name="signupsOpen" label="New sign-ups open" hint="When off, the sign-up form is replaced by a short message. Existing students can still sign in." defaultChecked={general.signupsOpen} />
            <FieldWithError name="authNotice" label="Notice on the sign-in page" hint="Optional, max 200 characters. Leave empty to hide.">
              <Input id="authNotice" name="authNotice" defaultValue={general.authNotice} maxLength={200} placeholder="e.g. Maintenance tonight 1–2 AM IST" />
            </FieldWithError>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
