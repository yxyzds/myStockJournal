"use client";

import { DDOG_BASE_INPUTS, DDOG_CURRENT_PRICE, valueDcf } from "@mystockjournal/shared";
import { useQuery } from "@tanstack/react-query";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dcf = valueDcf(DDOG_BASE_INPUTS, DDOG_CURRENT_PRICE);

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export default function Home() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => fetchJson<{ ok: boolean; service: string }>("/api/health"),
  });
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchJson<{ id: string; email: string; name: string }>("/api/me"),
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col gap-8 px-6 py-16">
      <header>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
          Phase 0 scaffold
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight">
          MyStockJournal
        </h1>
        <p className="mt-2 text-sm text-slate-500">Record decisions. Get rated. Stay honest.</p>
      </header>

      <section className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">API</h2>
        <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-slate-600">
          {health.isLoading && "Checking /api/health…"}
          {health.isError && "API is down — start Postgres and the API process"}
          {health.data && `ok · ${health.data.service}`}
        </p>
        {me.data && (
          <p className="mt-1 text-sm text-slate-500">
            Local user: {me.data.name} · {me.data.email}
          </p>
        )}
        <a
          href="/api/health"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
        >
          Open /api/health
        </a>
      </section>

      <section className="rounded-xl border border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">Shared DCF regression</h2>
        <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-slate-600">
          DDOG base FV ${dcf.bridge.fv.toFixed(2)} · MOS {dcf.bridge.mos.toFixed(1)}% vs $
          {DDOG_CURRENT_PRICE}
        </p>
      </section>
    </main>
  );
}
