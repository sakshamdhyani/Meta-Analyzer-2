import { NavLink, Outlet } from "react-router-dom";
import { useApp } from "../../context/AppContext";

const nav = [
  { to: "/", icon: "LayoutDashboard", label: "Dashboard", end: true },
  { to: "/tokens", icon: "KeyRound", label: "Tokens" },
  { to: "/adaccounts", icon: "Users", label: "Ad Accounts" },
  { to: "/campaigns", icon: "Target", label: "Campaigns" },
  { to: "/insights", icon: "BarChart3", label: "Insights" },
];

export default function AppLayout() {
  const { sidebarOpen } = useApp();

  return (
    <div className="flex min-h-screen">
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-56 bg-white border-r border-slate-200
          transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
        `}
      >
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-800 text-sm tracking-tight">Ad Accounts</span>
        </div>

        <nav className="p-2 space-y-0.5">
          {nav.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon name={icon} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-100">
          <p className="text-[0.7rem] text-slate-400 text-center">
            FB Ad Accounts Manager
          </p>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => {}}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Icon({ name }) {
  const icons = {
    LayoutDashboard: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    KeyRound: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.474c-.143.85-.503 1.665-1.098 2.372l-1.102 1.103a.75.75 0 00.965 1.064l1.102-1.103A6 6 0 0118 15.75m-3 0V21m-3-3h6" /></svg>,
    Users: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9 9 0 006.25-5.925m-6.25-5.925a9 9 0 01-6.25-5.925m6.25 5.925c-1.104 0-2-.896-2-2s.896-2 2-2 2 .896 2 2-.896 2-2 2zm-12 0c-1.104 0-2-.896-2-2s.896-2 2-2 2 .896 2 2-.896 2-2 2z" /></svg>,
    Target: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-9.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></svg>,
    BarChart3: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 15.375v-2.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-8.25zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  };
  return icons[name] || null;
}

function TopBar() {
  const { sidebarOpen, setSidebarOpen, toast } = useApp();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 sticky top-0 z-10">
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 md:hidden"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <div className="flex-1" />

      {toast && (
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-medium animate-fade ${
            toast.type === "error"
              ? "bg-rose-50 text-rose-600 border border-rose-200"
              : "bg-emerald-50 text-emerald-600 border border-emerald-200"
          }`}
        >
          {toast.message}
        </div>
      )}
    </header>
  );
}
