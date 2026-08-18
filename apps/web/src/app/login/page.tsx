import { loginAction } from "@/app/actions/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="login-kicker">AI-powered commercial intelligence</p>
        <h1>AI Signal CRM</h1>
        <p>Turn verified market signals into qualified commercial work—without asking the sales team to research every source manually.</p>
        <form action={loginAction}>
          <label><span>Email</span><input name="email" type="email" autoComplete="username" required placeholder="name@company.com" /></label>
          <label><span>Password</span><input name="password" type="password" required placeholder="Enter password" /></label>
          {error ? <p className="login-error">Incorrect role or password. Try one of the credentials below.</p> : null}
          <button className="button button-primary" type="submit">Open CRM workspace</button>
        </form>
      </section>
    </main>
  );
}
