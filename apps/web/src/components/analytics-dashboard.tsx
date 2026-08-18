import { Buildings, ChartLineUp, CheckCircle, CurrencyDollar, LinkBreak, NotePencil, Target, Tray, UserCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";

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

      <section className="analytics-panel data-quality-panel" aria-labelledby="data-quality-title">
        <header><div><p>Trust and completeness</p><h2 id="data-quality-title">Data quality</h2></div><span>Live checks across CRM records</span></header>
        <div className="data-quality-grid">
          <article><span><Buildings size={20} /></span><div><strong>{report.dataQuality.missingCompanyFields}</strong><small>Missing company fields</small></div></article>
          <article><span><UserCircle size={20} /></span><div><strong>{report.dataQuality.missingContactFields}</strong><small>Missing contact fields</small></div></article>
          <article><span><WarningCircle size={20} /></span><div><strong>{report.dataQuality.lowConfidenceLeads}</strong><small>Low-confidence leads</small></div></article>
          <article><span><LinkBreak size={20} /></span><div><strong>{report.dataQuality.missingOrBrokenEvidence}</strong><small>Broken or missing evidence</small></div></article>
          <article><span><NotePencil size={20} /></span><div><strong>{report.dataQuality.correctionsWaitingReview}</strong><small>Corrections waiting for review</small></div></article>
        </div>
      </section>

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

        <article className="analytics-panel analytics-wide-panel"><header><div><p>Acquisition efficiency</p><h2>Source performance</h2></div><span>Lead-to-pipeline attribution</span></header><div className="analytics-table"><div className="analytics-table-head"><span>Source</span><span>Imported</span><span>Approved</span><span>Rate</span><span>Pipeline</span></div>{report.sourcePerformance.map((source)=><div key={source.source}><strong>{source.source}</strong><span>{source.imported}</span><span>{source.approved}</span><span>{source.approvalRate}%</span><span>{money.format(source.pipelineValue)}</span></div>)}</div></article>

        <article className="analytics-panel analytics-wide-panel"><header><div><p>Team productivity</p><h2>Reviewer performance</h2></div><span>Human verification outcomes</span></header><div className="analytics-table reviewer"><div className="analytics-table-head"><span>Reviewer</span><span>Reviewed</span><span>Approved</span><span>Rate</span></div>{report.reviewerPerformance.map((reviewer)=><div key={reviewer.reviewer}><strong>{reviewer.reviewer}</strong><span>{reviewer.reviewed}</span><span>{reviewer.approved}</span><span>{reviewer.approvalRate}%</span></div>)}</div></article>

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
