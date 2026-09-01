import { SiteNav } from "@/components/site-nav";
import { JudgmentAccordion } from "./judgment-accordion";
import { RecentDecisions } from "./recent-decisions";
import { SiteFooter } from "./site-footer";
import { WatchList } from "./watch-list";

export function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <SiteNav />
      <main>
        <WatchList />
        <RecentDecisions />
        <JudgmentAccordion />
      </main>
      <SiteFooter />
    </div>
  );
}
