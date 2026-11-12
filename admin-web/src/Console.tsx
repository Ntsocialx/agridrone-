import { useState } from "react";
import { useApi, type User } from "./api";
import { NotifyTab } from "./NotifyTab";
import { PilotsTab } from "./PilotsTab";
import { ReportsTab, type JobReport, type ReviewReport } from "./ReportsTab";

type Tab = "pilots" | "reports" | "notify";

export function Console({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("pilots");
  // Loaded here so the Reports tab label can show how many are open.
  const reviewReports = useApi<ReviewReport[]>("/admin/reviews/reports");
  const jobReports = useApi<JobReport[]>("/admin/job-reports");
  const openReports = (reviewReports.data?.length ?? 0) + (jobReports.data?.length ?? 0);

  const tabs: { value: Tab; label: string }[] = [
    { value: "pilots", label: "Pilots" },
    { value: "reports", label: `Reports${openReports ? ` (${openReports})` : ""}` },
    { value: "notify", label: "Notify" },
  ];

  return (
    <div className="console">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src="/logo-agriseta.png" alt="" />
            <div>
              <p className="eyebrow">Admin console</p>
              <strong>AgricDrone Hub</strong>
            </div>
          </div>
          <div className="who">
            <span>{user.fullName}</span>
            <button type="button" className="link-danger" onClick={onSignOut}>Sign out</button>
          </div>
        </div>
        <nav className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              className={`tab ${tab === t.value ? "tab-active" : ""}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        <p className="muted small">Verification here is an internal platform check, not aviation-authority (SACAA) approval.</p>
        {tab === "pilots" ? <PilotsTab /> : null}
        {tab === "reports" ? <ReportsTab reviewReports={reviewReports} jobReports={jobReports} /> : null}
        {tab === "notify" ? <NotifyTab /> : null}
      </main>
    </div>
  );
}
