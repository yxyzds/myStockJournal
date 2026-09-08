"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DRIVER_LIMITS,
  dcfInputsFromAnchors,
  dcfModelReady,
  defaultAssumptions,
  evEbitdaInputsFromAnchors,
  isImplementedMethod,
  rdcfInputsFromAnchors,
  type DcfInputs,
  type EvEbitdaInputs,
  type ImplementedMethod,
  type PeInputs,
  type RdcfInputs,
  type ValuationAssumptions,
  type ValuationMethod,
  type ValuationModel,
  type ValuationSnapshot,
  type ValuationWorkbench,
  type WaccBuild,
} from "@mystockjournal/shared";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";
import { formatEntryDate } from "@/lib/format";
import { AccountAvatar } from "@/components/account-avatar";
import { NavLocaleToggle } from "@/components/language-switcher";
import type { ValuationActions } from "./actions";
import { DcfView } from "./dcf-view";
import { PeView } from "./pe-view";
import { RdcfView } from "./rdcf-view";
import { fmt2, methodLabel } from "./primitives";

type WorkbenchTab = "dcf" | "rdcf" | "multiples";

const WORKBENCH_TABS: { id: WorkbenchTab; labelKey: "valuation.tabDcf" | "valuation.tabRdcf" | "valuation.tabMultiples" }[] = [
  { id: "dcf", labelKey: "valuation.tabDcf" },
  { id: "rdcf", labelKey: "valuation.tabRdcf" },
  { id: "multiples", labelKey: "valuation.tabMultiples" },
];

function tabOf(method: ValuationMethod): WorkbenchTab {
  if (method === "pe" || method === "evebitda") return "multiples";
  if (method === "dcf" || method === "rdcf") return method;
  return "dcf";
}

function isMultiplesMethod(method: ValuationMethod): method is "pe" | "evebitda" {
  return method === "pe" || method === "evebitda";
}

type Drafts = {
  dcf: DcfInputs;
  rdcf: RdcfInputs;
  pe: PeInputs;
  evebitda: EvEbitdaInputs;
};

function draftsFrom(data: ValuationWorkbench): Drafts {
  const saved = (method: ImplementedMethod) =>
    data.models.find((model) => model.method === method)?.assumptions;
  const dcf = (saved("dcf") as DcfInputs | undefined) ?? dcfInputsFromAnchors(data.anchors);
  const rdcf = (saved("rdcf") as RdcfInputs | undefined) ?? rdcfInputsFromAnchors(data.anchors);
  const prefillWacc = data.anchors.waccBuild;
  const prefillRate = data.anchors.drivers.wacc;
  if (prefillWacc && prefillRate >= DRIVER_LIMITS.wacc.min) {
    if (!dcf.waccBuild) {
      dcf.wacc = prefillRate;
      dcf.waccBuild = prefillWacc;
    }
    if (!rdcf.waccBuild) {
      rdcf.wacc = prefillRate;
      rdcf.waccBuild = prefillWacc;
    }
  }
  // Filing-computed Y1 margin always wins over a stale saved worksheet.
  if (data.anchors.fcfMarginY1FromFilings) {
    dcf.fcfMarginY1 = data.anchors.drivers.fcfMarginY1;
    rdcf.fcfMarginY1 = data.anchors.drivers.fcfMarginY1;
  }
  // Older DCF worksheets predate the user MOS haircut.
  if (dcf.mosPercent == null || !Number.isFinite(dcf.mosPercent)) {
    dcf.mosPercent = 0;
  }
  const pe = (saved("pe") as PeInputs | undefined) ?? (defaultAssumptions("pe", data.anchors) as PeInputs);
  pe.ttmEps = data.anchors.ttmEps ?? 0;
  pe.fwdEps = data.anchors.fwdEps ?? 0;

  return {
    dcf,
    rdcf,
    pe,
    evebitda: evebitdaDraft(saved("evebitda"), data.anchors),
  };
}

function evebitdaDraft(saved: unknown, anchors: ValuationWorkbench["anchors"]): EvEbitdaInputs {
  const expected =
    saved &&
    typeof saved === "object" &&
    typeof (saved as EvEbitdaInputs).expectedEvEbitda === "number" &&
    Number.isFinite((saved as EvEbitdaInputs).expectedEvEbitda)
      ? (saved as EvEbitdaInputs).expectedEvEbitda
      : 0;
  return evEbitdaInputsFromAnchors(anchors, expected);
}

export function ValuationWorkbenchPage({ ticker }: { ticker: string }) {
  const { t } = useI18n();
  const symbol = ticker.toUpperCase();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [method, setMethod] = useState<ValuationMethod>("dcf");
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drafts are seeded once per ticker so a background refetch cannot discard edits.
  const seededTicker = useRef<string | null>(null);

  const workbenchQuery = useQuery({
    queryKey: ["valuation", symbol],
    queryFn: () => api<ValuationWorkbench>(`/stocks/${symbol}/valuation`),
  });
  const data = workbenchQuery.data;

  useEffect(() => {
    if (!data) return;
    if (seededTicker.current !== data.stock.ticker) {
      seededTicker.current = data.stock.ticker;
      setDrafts(draftsFrom(data));
      return;
    }
    setDrafts((current) => {
      if (!current) return draftsFrom(data);
      let next = current;
      // Filing FCF Y1 is a fact: stamp it onto the draft whenever anchors have it,
      // including after a refetch that arrived after the first seed.
      if (data.anchors.fcfMarginY1FromFilings) {
        const y1 = data.anchors.drivers.fcfMarginY1;
        if (next.dcf.fcfMarginY1 !== y1 || next.rdcf.fcfMarginY1 !== y1) {
          next = {
            ...next,
            dcf: { ...next.dcf, fcfMarginY1: y1 },
            rdcf: { ...next.rdcf, fcfMarginY1: y1 },
          };
        }
      }
      // Repair a stale Multiples draft left over from before evebitda seeding existed.
      if (typeof next.evebitda?.shares !== "number") {
        next = { ...next, evebitda: draftsFrom(data).evebitda };
      }
      return next;
    });
  }, [data]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  function flashSaved() {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["valuation", symbol] }),
      // My Fair Value drives the watch list and the stock header.
      queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
      queryClient.invalidateQueries({ queryKey: ["stock", symbol] }),
    ]);
  }

  const saveMutation = useMutation({
    mutationFn: (variables: {
      method: ImplementedMethod;
      assumptions: ValuationAssumptions;
      setAsMyFairValue: boolean;
    }) =>
      api<{ model: ValuationModel }>(`/stocks/${symbol}/valuation/${variables.method}`, {
        method: "PUT",
        body: JSON.stringify({
          assumptions: variables.assumptions,
          setAsMyFairValue: variables.setAsMyFairValue,
        }),
      }),
    onSuccess: async () => {
      flashSaved();
      await invalidate();
    },
  });

  const handOffMutation = useMutation({
    mutationFn: async (variables: {
      method: ImplementedMethod;
      assumptions: ValuationAssumptions;
    }) => {
      await api<{ model: ValuationModel }>(`/stocks/${symbol}/valuation/${variables.method}`, {
        method: "PUT",
        body: JSON.stringify({ assumptions: variables.assumptions, setAsMyFairValue: false }),
      });
      return api<{ snapshot: ValuationSnapshot }>(
        `/stocks/${symbol}/valuation/${variables.method}/snapshot`,
        { method: "POST" },
      );
    },
    onSuccess: async () => {
      await invalidate();
      router.push(`/stock/${symbol}`);
    },
  });

  if (workbenchQuery.isPending) {
    return <StatusScreen symbol={symbol} message={t("valuation.loading")} />;
  }

  if (workbenchQuery.error || !data || !drafts) {
    const message =
      workbenchQuery.error instanceof Error
        ? workbenchQuery.error.message
        : t("valuation.loadError");
    return <StatusScreen symbol={symbol} message={message} isError />;
  }

  const currentPrice = data.quote?.price ?? 0;
  const priceAsOf = data.quote?.fetchedAt ? formatEntryDate(data.quote.fetchedAt) : null;
  const myFairValueMethod = data.models.find((model) => model.isMyFairValue)?.method ?? null;
  const termGrowthFloor = Math.max(drafts.dcf.termGrowth, drafts.rdcf.termGrowth);

  function applyWacc(wacc: number, build: WaccBuild) {
    setDrafts((current) =>
      current
        ? {
            ...current,
            dcf: { ...current.dcf, wacc, waccBuild: build },
            rdcf: { ...current.rdcf, wacc, waccBuild: build },
          }
        : current,
    );
  }

  const activeAssumptions: ValuationAssumptions | null = isImplementedMethod(method)
    ? drafts[method]
    : null;

  const mutationError =
    saveMutation.error instanceof Error
      ? saveMutation.error.message
      : handOffMutation.error instanceof Error
        ? handOffMutation.error.message
        : null;

  const actions: ValuationActions = {
    saving: saveMutation.isPending,
    saved,
    handingOff: handOffMutation.isPending,
    error: mutationError,
    onSave: () => {
      if (!isImplementedMethod(method) || !activeAssumptions) return;
      saveMutation.mutate({ method, assumptions: activeAssumptions, setAsMyFairValue: false });
    },
    onSetFairValue: () => {
      if (!isImplementedMethod(method) || !activeAssumptions) return;
      saveMutation.mutate({ method, assumptions: activeAssumptions, setAsMyFairValue: true });
    },
    onUseInDecision: () => {
      if (!isImplementedMethod(method) || !activeAssumptions) return;
      handOffMutation.mutate({ method, assumptions: activeAssumptions });
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <TopBar
        symbol={symbol}
        name={data.stock.name}
        method={method}
        onTab={(tab) => {
          if (tab === "multiples") {
            setMethod((current) => (current === "evebitda" ? "evebitda" : "pe"));
            return;
          }
          setMethod(tab);
        }}
        myFairValue={data.myFairValue}
        myFairValueMethod={myFairValueMethod}
        actions={actions}
        canAct={
          isImplementedMethod(method) &&
          currentPrice > 0 &&
          (method === "dcf"
            ? dcfModelReady(drafts.dcf)
            : method === "rdcf"
              ? dcfModelReady(drafts.rdcf)
              : true)
        }
      />

      <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 md:px-7 md:py-[22px]">
        {mutationError && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-[12px] font-semibold text-red-700">
            {mutationError}
          </p>
        )}

        {currentPrice <= 0 ? (
          <EmptyState title={t("valuation.noPriceTitle")} body={t("valuation.noPriceBody")} />
        ) : !isImplementedMethod(method) ? (
          <EmptyState
            title={t("valuation.notBuiltTitle", { method: methodLabel(method, t) })}
            body={t("valuation.notBuiltBody")}
          />
        ) : method === "dcf" ? (
          <DcfView
            ticker={symbol}
            anchors={data.anchors}
            currentPrice={currentPrice}
            priceAsOf={priceAsOf}
            myFairValue={data.myFairValue}
            myFairValueMethod={myFairValueMethod}
            actions={actions}
            assumptions={drafts.dcf}
            onChange={(assumptions) => setDrafts({ ...drafts, dcf: assumptions })}
            review={data.dcfAssumptionReview}
            onReview={(review) => {
              queryClient.setQueryData<ValuationWorkbench>(["valuation", symbol], (prev) =>
                prev ? { ...prev, dcfAssumptionReview: review } : prev,
              );
            }}
            termGrowthFloor={termGrowthFloor}
            onApplyWacc={applyWacc}
          />
        ) : method === "rdcf" ? (
          <RdcfView
            ticker={symbol}
            anchors={data.anchors}
            currentPrice={currentPrice}
            priceAsOf={priceAsOf}
            myFairValue={data.myFairValue}
            myFairValueMethod={myFairValueMethod}
            actions={actions}
            assumptions={drafts.rdcf}
            onChange={(assumptions) => setDrafts({ ...drafts, rdcf: assumptions })}
            dcfBaseline={drafts.dcf}
            onOpenDcf={() => setMethod("dcf")}
            termGrowthFloor={termGrowthFloor}
            onApplyWacc={applyWacc}
          />
        ) : isMultiplesMethod(method) ? (
          <PeView
            ticker={symbol}
            anchors={data.anchors}
            currentPrice={currentPrice}
            priceAsOf={priceAsOf}
            myFairValue={data.myFairValue}
            myFairValueMethod={myFairValueMethod}
            actions={actions}
            lens={method === "evebitda" ? "evebitda" : "pe"}
            onLens={(next) => setMethod(next)}
            peAssumptions={drafts.pe}
            onPeChange={(assumptions) => setDrafts({ ...drafts, pe: assumptions })}
            evAssumptions={drafts.evebitda}
            onEvChange={(assumptions) => setDrafts({ ...drafts, evebitda: assumptions })}
          />
        ) : null}
      </div>
    </div>
  );
}

function TopBar({
  symbol,
  name,
  method,
  onTab,
  myFairValue,
  myFairValueMethod,
  actions,
  canAct,
}: {
  symbol: string;
  name: string;
  method: ValuationMethod;
  onTab: (tab: WorkbenchTab) => void;
  myFairValue: number | null;
  myFairValueMethod: ValuationMethod | null;
  actions: ValuationActions;
  canAct: boolean;
}) {
  const { t } = useI18n();
  // A reverse DCF outputs the market's implied growth, so it has no fair value to set.
  const producesFairValue = method !== "rdcf";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-2.5 pb-1.5 md:gap-2.5 md:px-6">
        <Link
          href={`/stock/${symbol}`}
          className="flex shrink-0 items-center gap-1.5 text-slate-500 hover:text-slate-900"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
            <path
              d="M8.5 10.5L4.5 6.5l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[12px] font-medium">{symbol}</span>
        </Link>
        <span className="hidden text-slate-200 md:block">/</span>
        <div className="hidden items-center gap-1.5 md:flex">
          <span className="font-heading text-[14px] font-bold text-slate-900">{name}</span>
          <span className="text-slate-300">·</span>
          <span className="text-[12px] font-semibold text-slate-500">{t("valuation.title")}</span>
          {myFairValue !== null && (
            <span className="ml-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-[7px] py-0.5 text-[10px] font-bold text-emerald-700">
              {myFairValueMethod
                ? t("valuation.myFairValueChipMethod", {
                    value: fmt2(myFairValue),
                    method: methodLabel(myFairValueMethod, t),
                  })
                : t("valuation.myFairValueChip", { value: fmt2(myFairValue) })}
            </span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={actions.onSave}
            disabled={!canAct || actions.saving}
            className={`rounded-[7px] px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-50 md:px-3 ${
              actions.saved ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {actions.saved ? t("common.saved") : actions.saving ? t("common.saving") : t("common.save")}
          </button>
          {producesFairValue && (
            <button
              type="button"
              onClick={actions.onSetFairValue}
              disabled={!canAct || actions.saving}
              className="hidden rounded-[7px] bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 md:block"
            >
              {t("valuation.setFairValue")}
            </button>
          )}
          <NavLocaleToggle />
          <AccountAvatar />
        </div>
      </div>

      <div className="overflow-x-auto px-4 pb-2.5 md:px-6">
        <div className="flex w-fit items-center rounded-[7px] bg-slate-100 p-[3px]">
          {WORKBENCH_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTab(tab.id)}
              className={`rounded-[5px] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
                tabOf(method) === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[14px] border border-slate-100 bg-white px-6 py-16 text-center">
      <p className="font-heading text-[18px] font-bold text-slate-700">{title}</p>
      <p className="max-w-[420px] text-[12px] leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

function StatusScreen({
  symbol,
  message,
  isError = false,
}: {
  symbol: string;
  message: string;
  isError?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <header className="border-b border-slate-100 bg-white px-4 py-3 md:px-6">
        <Link href={`/stock/${symbol}`} className="text-[12px] font-medium text-slate-500 hover:text-slate-900">
          ← {symbol}
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-6">
        <p className={`text-[13px] ${isError ? "font-semibold text-red-600" : "text-slate-400"}`}>
          {message}
        </p>
      </div>
    </div>
  );
}