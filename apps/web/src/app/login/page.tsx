import { loginDemoAction } from "@/app/actions/demo-auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="login-kicker">AI-powered commercial intelligence</p>
        <h1>AI Signal CRM</h1>
        <p>Turn verified market signals into qualified commercial work—without asking the sales team to research every source manually.</p>
        <form action={loginDemoAction}>
          <label><span>Role</span><select name="role" defaultValue="marketer"><option value="marketer">Marketer / Signal reviewer</option><option value="manager">Manager / Commercial dashboard</option></select></label>
          <label><span>Password</span><input name="password" type="password" required placeholder="Enter password" /></label>
          {error ? <p className="login-error">Incorrect role or password. Try one of the credentials below.</p> : null}
          <button className="button button-primary" type="submit">Open CRM workspace</button>
        </form>
        <div className="demo-credentials"><strong>Workspace access</strong><span>Manager password: <code>Manager2026!</code></span><span>Marketer password: <code>Marketer2026!</code></span></div>
      </section>
    </main>
  );
}
