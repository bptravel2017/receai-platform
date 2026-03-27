import { AppNavLinks } from "@/components/navigation/app-nav-links";
import type { AuthenticatedAppContext } from "@/lib/auth/types";

type AppSidebarProps = {
  context: AuthenticatedAppContext;
};

export function AppSidebar({ context }: AppSidebarProps) {
  return (
    <aside className="sidebar stack bg-white border-r border-gray-200">
      <div className="stack">
        <div>
          <p className="eyebrow text-sm font-medium text-gray-500 uppercase tracking-wider">ReceAI v2</p>
          <h2>{context.workspace.name}</h2>
          <p className="muted text-sm text-gray-600">
            {context.profile.fullName?.trim() || context.user.email}
          </p>
          <p className="muted text-sm text-gray-600">Signed in as {context.user.email}</p>
        </div>

        <section className="surface sidebar-card stack bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="eyebrow text-sm font-medium text-gray-500 uppercase tracking-wider">Workspace</p>
            <p className="sidebar-meta">
              <strong>{context.workspace.slug}</strong>
            </p>
            <p className="muted text-sm text-gray-600">Role: {context.workspace.role}</p>
            <p className="muted text-sm text-gray-600">Plan: {context.workspace.plan}</p>
            <p className="muted text-sm text-gray-600">
              Billing: {context.billing?.plan ?? "No plan"} • {context.billing?.status ?? "not_started"}
            </p>
          </div>

          {context.workspace.plan !== "business" ? (
            <a className="button-accent bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200" href="/pricing">
              Upgrade
            </a>
          ) : null}

          <form action="/auth/sign-out" method="post">
            <button className="button-secondary bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200" type="submit">
              Logout
            </button>
          </form>
        </section>
      </div>

      <nav aria-label="Authenticated workspace navigation">
        <AppNavLinks plan={context.workspace.plan} />
      </nav>
    </aside>
  );
}
