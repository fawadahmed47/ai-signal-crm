import { ChartLineUp, CheckCircle, CurrencyDollar, Target, Tray } from "@phosphor-icons/react/dist/ssr";

import type { AnalyticsBreakdownDTO, AnalyticsReportDTO } from "@/types/analytics";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function Breakdown({ items, showValue = false }: { items: AnalyticsBreakdownDTO[]; showValue?: boolean }) {
  const maximum = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="analytics-breakdown">
      {items.map((item) => (
        <div className="analytics-breakdown-row" key={item.label}>
          <div><strong>{item.label}</strong><span>{showValue ? money.format(item.value ?? 0) : item.count}</span></div>
          <div className="analytics-bar-track" aria-hidden="true">
            <span style={{ width: `${(item.count / maximum) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsDashboard({ report, loadError }: { report?: AnalyticsReportDTO; loadError?: string }) {
  if (loadError || !report) {
    return <section className="analytics-empty"><ChartLineUp size={34} /><h2>Reports are unavailable</h2><p>{loadError}</p></section>;
  }

  const maxTrend = Math.max(...report.weeklyTrend.map((week) => week.imported), 1);
  const hasData = report.summary.totalSignals > 0 || report.summary.totalAccounts > 0;

  return (
    <div className="analytics-dashboard">
      <section className="analytics-summary" aria-label="Commercial performance summary">
        <article><span><Tray size={22} /></span><div><small>Total signals</small><strong>{report.summary.totalSignals}</strong><em>{report.summary.approvalRate}% approved</em></div></article>
        <article><span><CheckCircle size={22} /></span><div><small>Approved accounts</small><strong>{report.summary.totalAccounts}</strong><em>Created from reviewed signals</em></div></article>
        <article><span><Target size={22} /></span><div><small>Open pipeline</small><strong>{money.format(report.summary.openPipelineValue)}</strong><em>Excludes won and lost</em></div></article>
        <article><span><CurrencyDollar size={22} /></span><div><small>Won revenue</small><strong>{money.format(report.summary.wonRevenue)}</strong><em>Closed-won opportunity value</em></div></article>
      </section>

      {!hasData ? <section className="analytics-notice">Analytics are ready. Import and review signals to populate this report.</section> : null}

      <section className="analytics-grid">
        <article className="analytics-panel analytics-trend-panel">
          <header><div><p>Signal velocity</p><h2>Six-week intake</h2></div><span>Imported vs approved</span></header>
          <div className="analytics-trend" aria-label="Signals imported and approved over six weeks">
            {report.weeklyTrend.map((week) => (
              <div className="analytics-week" key={week.label}>
                <div className="analytics-columns">
                  <span className="imported" style={{ height: `${Math.max((week.imported / maxTrend) * 100, week.imported ? 8 : 0)}%` }} title={`${week.imported} imported`} />
                  <span className="approved" style={{ height: `${Math.max((week.approved / maxTrend) * 100, week.approved ? 8 : 0)}%` }} title={`${week.approved} approved`} />
                </div>
                <small>{week.label}</small>
              </div>
            ))}
          </div>
          <footer><span><i className="imported" />Imported</span><span><i className="approved" />Approved</span></footer>
        </article>

        <article className="analytics-panel">
          <header><div><p>Review outcomes</p><h2>Signal status</h2></div><span>{report.summary.totalSignals} total</span></header>
          <Breakdown items={report.signalStatuses} />
        </article>

        <article className="analytics-panel">
          <header><div><p>Commercial progress</p><h2>Pipeline by stage</h2></div><span>Value and volume</span></header>
          <Breakdown items={report.pipelineStages} showValue />
        </article>

        <article className="analytics-panel">
          <header><div><p>Signal intelligence</p><h2>Leading categories</h2></div><span>Top six</span></header>
          {report.signalCategories.length ? <Breakdown items={report.signalCategories} /> : <p className="analytics-panel-empty">No categories imported yet.</p>}
        </article>

        <article className="analytics-panel">
          <header><div><p>Execution health</p><h2>Tasks</h2></div><span>Current workload</span></header>
          <Breakdown items={report.taskHealth} />
        </article>
      </section>

      <p className="analytics-freshness">Live PostgreSQL report · generated {new Date(report.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</p>
    </div>
  );
}
