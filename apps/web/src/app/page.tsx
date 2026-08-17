import { ArrowRight, Database, Palette, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/app-shell";

const foundations = [
  {
    icon: Palette,
    title: "Design system",
    detail: "Tokens, typography and reusable interface patterns",
    status: "Ready",
  },
  {
    icon: Database,
    title: "CRM data model",
    detail: "Signals, accounts and opportunities with traceable evidence",
    status: "In review",
  },
  {
    icon: ShieldCheck,
    title: "Human approval",
    detail: "Every material CRM change remains operator controlled",
    status: "Defined",
  },
];

export default function Home() {
  return (
    <AppShell title="Workspace overview" subtitle="The foundation for evidence-led commercial decisions">
      <section className="welcome-card">
        <div>
          <span className="status-pill"><span /> Product foundation</span>
          <h2>Turn market signals into confident next steps.</h2>
          <p>
            Review AI-detected developments, preserve their evidence and convert the strongest signals into accountable commercial work.
          </p>
        </div>
        <button className="button button-primary" type="button">
          Open Signal Inbox <ArrowRight size={18} weight="bold" />
        </button>
      </section>

      <section className="section-block" aria-labelledby="foundation-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">ASCRM-8</p>
            <h2 id="foundation-heading">Application foundation</h2>
          </div>
          <span className="quiet-label">Updated today</span>
        </div>

        <div className="foundation-grid">
          {foundations.map(({ icon: Icon, title, detail, status }) => (
            <article className="foundation-card" key={title}>
              <span className="icon-tile"><Icon size={22} weight="duotone" /></span>
              <div>
                <div className="card-title-row">
                  <h3>{title}</h3>
                  <span className="small-status">{status}</span>
                </div>
                <p>{detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block component-preview" aria-labelledby="components-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Reusable patterns</p>
            <h2 id="components-heading">Interface controls</h2>
          </div>
        </div>
        <div className="control-row">
          <button className="button button-primary" type="button">Primary action</button>
          <button className="button button-secondary" type="button">Secondary action</button>
          <label className="field">
            <span>Workspace filter</span>
            <input defaultValue="All signals" aria-label="Workspace filter" />
          </label>
        </div>
      </section>
    </AppShell>
  );
}
