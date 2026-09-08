"use client";

import { useClerk } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AccountAvatar } from "@/components/account-avatar";
import { LanguageSwitcher, NavLocaleToggle } from "@/components/language-switcher";
import { useI18n } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { isClerkEnabled, type Me } from "@/lib/clerk";
import { initials } from "@/lib/initials";

type Tab = "account" | "subscription" | "billing";

const TAB_LABEL_KEY: Record<Tab, "settings.account" | "settings.subscription" | "settings.billing"> = {
  account: "settings.account",
  subscription: "settings.subscription",
  billing: "settings.billing",
};

const NAV: { id: Tab; icon: ReactNode }[] = [
  {
    id: "account",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M2.5 13c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "subscription",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 2l1.6 3.4 3.7.5-2.7 2.6.7 3.7L8 10.5l-3.3 1.7.7-3.7L2.7 5.9l3.7-.5L8 2z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "billing",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1.5" y="3.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.3" />
        <rect x="3.5" y="9" width="3" height="1.5" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
];

const AVATAR_GRADIENT = "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)";

function ProfileAvatar({ name, size }: { name: string; size: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: AVATAR_GRADIENT, fontSize: size > 48 ? 22 : 13 }}
    >
      {initials(name)}
    </div>
  );
}

function AccountPanel({ me }: { me: Me }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(me.name);
    setEmail(me.email);
  }, [me.name, me.email]);

  const save = useMutation({
    mutationFn: () =>
      api<Me>("/me", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    },
  });

  const error = save.error instanceof ApiError ? save.error.message : save.isError ? t("settings.saveError") : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[22px] leading-snug font-bold text-slate-900">{t("settings.account")}</h1>
        <p className="mt-1 text-[14px] text-slate-500">{t("settings.accountSubtitle")}</p>
      </div>

      <div className="flex items-center gap-5 rounded-2xl border border-[#e8eef5] bg-white p-6 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <ProfileAvatar name={name || me.name} size={64} />
        <div>
          <p className="text-[15px] font-semibold text-slate-800">{name || me.name}</p>
          <p className="mt-0.5 text-[13px] text-slate-500">{email || me.email}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e8eef5] bg-white shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <div className="rounded-t-2xl border-b border-slate-100 px-6 py-[18px]">
          <p className="text-[14px] font-semibold text-slate-800">{t("settings.profileDetails")}</p>
        </div>
        <div className="relative z-10 flex flex-col gap-5 px-6 py-[22px]">
          <Field label={t("settings.fullName")} value={name} onChange={setName} />
          <Field label={t("settings.email")} value={email} onChange={setEmail} type="email" />
          <Field
            label={t("settings.username")}
            value={me.username}
            onChange={() => {}}
            disabled
            hint={t("settings.usernameHint")}
          />
          <LanguageSwitcher />
        </div>
        <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4">
          {saved ? <span className="text-[13px] font-medium text-emerald-500">{t("settings.changesSaved")}</span> : <div />}
          {error ? <span className="mr-auto text-[13px] font-medium text-red-500">{error}</span> : null}
          <button
            type="button"
            disabled={save.isPending || !name.trim() || !email.trim()}
            onClick={() => save.mutate()}
            className="rounded-[9px] px-[18px] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ background: AVATAR_GRADIENT }}
          >
            {save.isPending ? t("common.saving") : t("settings.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold tracking-wide text-slate-600 uppercase">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-[9px] border px-3.5 py-2.5 text-[14px] outline-none transition-all ${
          disabled
            ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
            : "border-slate-200 bg-white text-slate-800 focus:border-blue-600 focus:shadow-[0_0_0_3px_#eff6ff]"
        }`}
      />
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function UsageBar({ value, max, color = "#2563eb" }: { value: number; max: number | null; color?: string }) {
  const pct = max === null ? 100 : Math.min((value / max) * 100, 100);
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function UsageCard({
  label,
  value,
  max,
  unit,
  note,
  proBenefit,
  color,
}: {
  label: string;
  value: number;
  max: number | null;
  unit: string;
  note?: string;
  proBenefit?: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-[#e8eef5] bg-white px-[18px] py-4 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] leading-none font-bold tracking-widest text-slate-400 uppercase">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-[28px] leading-none font-bold text-slate-900">{value}</span>
        <span className="text-[14px] text-slate-400">{max !== null ? `/ ${max} ${unit}` : `/ ${unit}`}</span>
      </div>
      <UsageBar value={value} max={max} color={color} />
      {proBenefit ? <p className="text-[11px] font-semibold text-emerald-500">{proBenefit}</p> : null}
      {note ? <p className="text-[11px] text-slate-400">{note}</p> : null}
    </div>
  );
}

function SubscriptionPanel() {
  const { t } = useI18n();
  const [showCancel, setShowCancel] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[22px] leading-snug font-bold text-slate-900">{t("settings.subscription")}</h1>
        <p className="mt-1 text-[14px] text-slate-500">{t("settings.subscriptionSubtitle")}</p>
      </div>

      <div
        className="flex items-start justify-between gap-4 rounded-2xl border border-blue-200 bg-white p-6"
        style={{ boxShadow: "0 1px 8px rgba(37,99,235,0.08)" }}
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="rounded-[5px] bg-blue-600 px-2 py-[3px] text-[10px] font-bold tracking-widest text-white uppercase">
              {t("settings.activePlan")}
            </span>
            <span className="text-[24px] leading-none font-bold text-slate-900">{t("settings.proPlan")}</span>
          </div>
          <p className="text-[14px] text-slate-500">{t("settings.planBlurb")}</p>
          <div className="mt-1 flex items-center gap-7">
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">{t("settings.price")}</p>
              <p className="text-[20px] leading-none font-bold text-slate-900">
                $19<span className="text-[14px] font-normal text-slate-500">{t("settings.perMonth")}</span>
              </p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">{t("settings.status")}</p>
              <div className="flex items-center gap-1.5">
                <div className="size-[7px] rounded-full bg-emerald-500" />
                <p className="text-[13px] font-semibold text-emerald-500">{t("common.comingSoon")}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-[10px] border border-slate-200 bg-white px-[18px] py-[9px] text-[13px] font-semibold text-slate-400"
          >
            {t("settings.managePlan")}
          </button>
          <button
            type="button"
            onClick={() => setShowCancel((v) => !v)}
            className="bg-transparent text-[12px] text-slate-400 hover:text-red-500"
          >
            {t("settings.cancelSubscription")}
          </button>
        </div>
      </div>

      {showCancel ? (
        <div className="flex items-center justify-between gap-4 rounded-[14px] border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-[13px] text-rose-800">{t("settings.cancelPreview")}</p>
          <button
            type="button"
            onClick={() => setShowCancel(false)}
            className="shrink-0 rounded-[7px] border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600"
          >
            {t("common.close")}
          </button>
        </div>
      ) : null}

      <div>
        <p className="mb-3.5 text-[11px] font-bold tracking-widest text-slate-400 uppercase">{t("settings.currentUsage")}</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <UsageCard label={t("settings.usageAi")} value={0} max={50} unit={t("settings.thisMonth")} color="#2563eb" />
          <UsageCard
            label={t("settings.usageValuations")}
            value={0}
            max={null}
            unit={t("settings.unlimited")}
            proBenefit={t("settings.proBenefitUnlimited")}
            color="#10b981"
          />
          <UsageCard label={t("settings.usageFilings")} value={0} max={20} unit="" color="#2563eb" />
        </div>
      </div>
    </div>
  );
}

const INVOICES = [
  { id: "INV-preview", date: "—", amount: "—" },
];

function BillingPanel() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[22px] leading-snug font-bold text-slate-900">{t("settings.billing")}</h1>
        <p className="mt-1 text-[14px] text-slate-500">{t("settings.billingSubtitle")}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e8eef5] bg-white shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-[18px]">
          <p className="text-[14px] font-semibold text-slate-800">{t("settings.paymentMethod")}</p>
          <span className="text-[13px] font-medium text-slate-400">{t("common.comingSoon")}</span>
        </div>
        <div className="px-6 py-5 text-[13px] text-slate-500">{t("settings.noCard")}</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e8eef5] bg-white shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-6 py-[18px]">
          <p className="text-[14px] font-semibold text-slate-800">{t("settings.invoiceHistory")}</p>
        </div>
        {INVOICES.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between px-6 py-3.5">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-slate-800">{t("settings.noInvoices")}</span>
              <span className="mt-px text-[11px] text-slate-400">{inv.date}</span>
            </div>
            <span className="font-mono text-[13px] font-semibold text-slate-800 tabular-nums">{inv.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignOutRow() {
  if (!isClerkEnabled) return null;
  return (
    <div className="border-t border-[#ebf0f5] p-2.5">
      <SignOutButton />
    </div>
  );
}

function SignOutButton() {
  const { t } = useI18n();
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectUrl: "/sign-in" })}
      className="flex w-full cursor-pointer items-center gap-2 rounded-[10px] bg-transparent px-3 py-2.5 text-left hover:bg-slate-50"
    >
      <span className="text-[13px] font-medium text-slate-400 hover:text-slate-600">{t("common.signOut")}</span>
    </button>
  );
}

function SidebarInner({
  tab,
  setTab,
  name,
  onClose,
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  name: string;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-[#ebf0f5] px-5 py-5">
        <ProfileAvatar name={name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-800">{name || t("common.account")}</p>
          <p className="truncate text-[11px] text-slate-400">{t("settings.proPlan")}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f4f6f9] text-slate-400 hover:bg-[#ebf0f5] hover:text-slate-600"
            aria-label={t("common.closeMenu")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              onClose?.();
            }}
            className={`flex w-full cursor-pointer items-center gap-[11px] rounded-[10px] px-3 py-[11px] text-left ${
              tab === item.id ? "bg-blue-50" : "bg-transparent hover:bg-slate-50"
            }`}
          >
            <span className={tab === item.id ? "text-blue-600" : "text-slate-400"}>{item.icon}</span>
            <span className={`flex-1 text-[13px] font-semibold ${tab === item.id ? "text-blue-600" : "text-slate-600"}`}>
              {t(TAB_LABEL_KEY[item.id])}
            </span>
            {tab === item.id ? <div className="size-1.5 shrink-0 rounded-full bg-blue-600" /> : null}
          </button>
        ))}
      </nav>

      <SignOutRow />
    </div>
  );
}

export function SettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("account");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/me"),
  });
  const me = meQuery.data;
  const activeLabel = t(TAB_LABEL_KEY[tab]);
  const name = me?.name ?? "";

  return (
    <div className="min-h-screen bg-[#f4f6f9] pb-[max(3rem,env(safe-area-inset-bottom))] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#ebf0f5] bg-white pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between gap-2 px-3 md:h-16 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                  return;
                }
                router.push("/");
              }}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f4f6f9] hover:bg-[#ebf0f5]"
              aria-label={t("common.back")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 13L5 8l5-5" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-bold text-slate-900 md:text-lg">{t("settings.title")}</p>
                <span className="hidden h-4 w-px bg-[#ebf0f5] md:block" />
                <p className="hidden truncate text-[14px] text-slate-500 md:inline">{activeLabel}</p>
              </div>
              <p className="truncate text-[12px] text-slate-500 md:hidden">{activeLabel}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex size-8 items-center justify-center rounded-full bg-[#f4f6f9] hover:bg-[#ebf0f5] md:hidden"
              aria-label={t("common.openMenu")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <NavLocaleToggle />
            <AccountAvatar />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[220px] shrink-0 flex-col self-start border-r border-[#ebf0f5] md:top-16 md:flex md:h-[calc(100vh-4rem)]">
          <SidebarInner tab={tab} setTab={setTab} name={name} />
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-[rgba(15,23,42,0.35)]" onClick={() => setDrawerOpen(false)} />
            <div className="relative z-10 h-full w-[260px] pt-[env(safe-area-inset-top)] shadow-2xl">
              <SidebarInner tab={tab} setTab={setTab} name={name} onClose={() => setDrawerOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="w-full min-w-0 max-w-[760px] flex-1 px-3 py-4 md:px-9 md:py-9">
          {meQuery.isError ? (
            <p className="text-[13px] text-red-500">{t("settings.loadError")}</p>
          ) : !me ? (
            <p className="text-[13px] text-slate-400">{t("common.loading")}</p>
          ) : (
            <>
              {tab === "account" ? <AccountPanel me={me} /> : null}
              {tab === "subscription" ? <SubscriptionPanel /> : null}
              {tab === "billing" ? <BillingPanel /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
