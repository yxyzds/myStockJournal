import Link from "next/link";
import { DECISIONS, decisionHref, type MockDecision } from "@/lib/mock-journal";

function ActionChip({ label, color }: { label: string; color: string }) {
  const styles: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-[7px] py-[3px] font-mono text-[10px] font-semibold tracking-wide uppercase ${styles[color] ?? styles.blue}`}
    >
      {label}
    </span>
  );
}

function ScoreControl({ score, variant }: { score?: number; variant?: string }) {
  if (variant === "none") {
    return (
      <span className="rounded-[6px] border border-blue-200 px-[10px] py-[5px] text-[12px] font-medium whitespace-nowrap text-blue-600 md:px-3 md:py-1.5">
        Rate →
      </span>
    );
  }
  const isWeak = variant === "weak";
  return (
    <span className="flex items-baseline gap-0.5">
      <span
        className={`font-mono text-[22px] leading-none font-bold tabular-nums md:text-[28px] ${isWeak ? "text-amber-500" : "text-emerald-600"}`}
      >
        {score}
      </span>
      <span className="text-[11px] font-medium text-slate-400">/100</span>
    </span>
  );
}

function DecisionRowDesktop({ d }: { d: MockDecision }) {
  return (
    <Link href={decisionHref(d)} className="-mx-4 block rounded-lg px-4 transition-colors hover:bg-slate-50">
      <div className="group flex items-center justify-between py-5">
        <div className="flex min-w-0 flex-1 items-start gap-5">
          <span className="w-11 shrink-0 pt-0.5 text-[12px] font-medium whitespace-nowrap text-slate-400">
            {d.dateLabel}
          </span>
          <div className="shrink-0 pt-px">
            <ActionChip label={d.action} color={d.actionColor} />
          </div>
          <span className="w-11 shrink-0 pt-px font-mono text-[14px] font-bold text-slate-900">{d.ticker}</span>
          <p className="truncate text-[14px] leading-snug text-slate-600 transition-colors group-hover:text-slate-800">
            {d.rationale}
          </p>
        </div>
        <div className="ml-8 shrink-0">
          <ScoreControl score={d.score} variant={d.scoreVariant} />
        </div>
      </div>
    </Link>
  );
}

function DecisionCardMobile({ d }: { d: MockDecision }) {
  return (
    <Link href={decisionHref(d)} className="block">
      <div className="flex items-start justify-between gap-2.5 rounded-xl border border-slate-100 bg-white px-3.5 py-3 active:bg-slate-50">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ActionChip label={d.action} color={d.actionColor} />
            <span className="font-mono text-[13px] font-bold text-slate-900">{d.ticker}</span>
            <span className="ml-auto shrink-0 text-[11px] text-slate-400">{d.dateLabel}</span>
          </div>
          <p className="line-clamp-2 text-[13px] leading-snug text-slate-600">{d.rationale}</p>
        </div>
        <div className="flex shrink-0 items-center pl-1.5">
          <ScoreControl score={d.score} variant={d.scoreVariant} />
        </div>
      </div>
    </Link>
  );
}

export function RecentDecisions() {
  return (
    <section className="w-full py-8 md:py-12">
      <div className="mx-auto max-w-[1080px] px-4 md:px-8">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-heading text-[20px] font-bold text-slate-900 md:text-2xl">Recent Decisions</h2>
          <span className="text-[12px] font-medium text-blue-600 md:text-[13px]">View all</span>
        </div>
        <div className="mt-4 flex flex-col gap-2 md:hidden">
          {DECISIONS.map((d) => (
            <DecisionCardMobile key={d.id} d={d} />
          ))}
        </div>
        <div className="mt-1 hidden divide-y divide-slate-100 md:block">
          {DECISIONS.map((d) => (
            <DecisionRowDesktop key={d.id} d={d} />
          ))}
        </div>
      </div>
    </section>
  );
}
