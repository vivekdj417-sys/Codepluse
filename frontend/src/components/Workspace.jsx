import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  getCurrentUser,
  getDailyPlan,
  getLeetCodeProfile,
  getOverview,
  getRecommendations,
  importProfile,
  syncRecentLeetCode,
} from "../api.js";
import { copy, views } from "./appConfig.js";
import ProblemBoard from "./ProblemBoard.jsx";
import {
  AnalyticsPanel,
  DailyPlanPanel,
  EmptyPanel,
  OverviewPanel,
  RecommendationsPanel,
} from "./DashboardPanels.jsx";

export default function Workspace({ user, onLogout }) {
  const [dialog, setDialog] = useState(false);
  const [username, setUsername] = useState(
    "",
  );
  const [message, setMessage] = useState("");
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState("");
  const [recommendations, setRecommendations] = useState(null);
  const [leetcodeProfile, setLeetcodeProfile] = useState(null);
  const [dailyPlan, setDailyPlan] = useState(null);
  const [fullSyncRequired, setFullSyncRequired] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const location = useLocation();
  const view = location.pathname === "/" ? "/dashboard" : location.pathname;
  useEffect(() => {
    if (view === "/daily-plan" && localStorage.getItem("codepulse_token")) {
      getDailyPlan(60).then((result) => setDailyPlan(result.data.data)).catch(() => setDailyPlan(null));
    }
  }, [view]);
  useEffect(() => {
    if (localStorage.getItem("codepulse_token")) {
      Promise.allSettled([getOverview(), getCurrentUser(), getRecommendations()])
        .then(([overviewResult, userResult, recommendationsResult]) => {
          if (overviewResult.status === "fulfilled") {
            setOverview(overviewResult.value.data.data);
          }
          if (userResult.status === "fulfilled") {
            setUsername(userResult.value.data.user.leetcodeUsername || "");
          }
          if (recommendationsResult.status === "fulfilled") {
            setRecommendations(recommendationsResult.value.data);
          }
          setOverviewError("");
        });
    }
  }, []);
  useEffect(() => {
    let syncing = false;
    let lastSyncAt = 0;
    const syncNewProblems = async () => {
      if (!localStorage.getItem("codepulse_token") || syncing || Date.now() - lastSyncAt < 15 * 60 * 1000) {
        return;
      }

      syncing = true;
      lastSyncAt = Date.now();
      try {
        const result = await syncRecentLeetCode();
        if (result.data.requiresFullSync) {
          setFullSyncRequired(true);
          setOverviewError("Complete the full LeetCode sync once to enable automatic updates.");
          return;
        }
        setFullSyncRequired(false);
        if (result.data.added > 0) {
          const [overviewResult, recommendationsResult] = await Promise.all([
            getOverview(),
            getRecommendations(),
          ]);
          setOverview(overviewResult.data.data);
          setRecommendations(recommendationsResult.data);
        }
      } catch (error) {
        setOverviewError(
          error.response?.data?.message || "Unable to check for new LeetCode problems.",
        );
      } finally {
        syncing = false;
      }
    };

    syncNewProblems();
    const interval = window.setInterval(syncNewProblems, 15 * 60 * 1000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") syncNewProblems();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, []);
  useEffect(() => {
    const refreshOverview = () => {
      if (!localStorage.getItem("codepulse_token")) return;
      getOverview()
        .then((result) => {
          setOverview(result.data.data);
          setOverviewError("");
        })
        .catch((error) => {
          setOverviewError(error.response?.data?.message || "Unable to load your synced solved problems.");
        });
    };
    const interval = window.setInterval(refreshOverview, 5000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (username && localStorage.getItem("codepulse_token"))
      getLeetCodeProfile(username)
        .then((result) => setLeetcodeProfile(result.data))
        .catch(() => {});
  }, [username]);
  const submitImport = async (event) => {
    event.preventDefault();
    try {
      const result = await importProfile(username);
      setUsername(username.trim());
      setLeetcodeProfile(result.data);
      setDialog(false);

      const overviewResult = await getOverview();
      setOverview(overviewResult.data.data);
      const recommendationsResult = await getRecommendations();
      setRecommendations(recommendationsResult.data);
      setOverviewError("");
      setMessage(
        "Profile connected. Use the CodePulse Chrome extension while logged into LeetCode to sync your solved problem IDs."
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          (error.response ? `Profile import failed (${error.response.status}).` : "Cannot connect to the backend."),
      );
    }
  };
  const copyExtensionToken = async () => {
    await navigator.clipboard.writeText(localStorage.getItem("codepulse_token") || "");
    setTokenCopied(true);
    window.setTimeout(() => setTokenCopied(false), 2000);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/dashboard">
          <span className="brand-mark">◒</span>
          <span>
            CODE<span>PULSE</span>
          </span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {views.map((item) => (
            <NavLink className="nav-item" to={item.path} key={item.path}>
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="nav-label">PROFILE</p>
          {!username && (
            <button className="nav-item" onClick={() => setDialog(true)}>
              <span>◎</span>Import profile
            </button>
          )}
          <div className="user-chip">
            <span className="avatar">
              {user.name?.slice(0, 2).toUpperCase() || "CP"}
            </span>
            <div>
              <b>{user.name}</b>
              <small>{username || "Not connected"}</small>
            </div>
          </div>
          <button className="logout" onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              CODING INTELLIGENCE / {view.slice(1).toUpperCase()}
            </p>
            <h1>{copy[view]?.[0] || copy["/dashboard"][0]}</h1>
          </div>
          {fullSyncRequired && (
            <button className="import-button" onClick={copyExtensionToken}>
              {tokenCopied ? "Token copied" : "Copy token for full sync"}
            </button>
          )}
        </header>
        <section className="view active-view">
          {view === "/dashboard" ? (
            <OverviewPanel overview={overview} profile={leetcodeProfile} onImport={username ? null : () => setDialog(true)} />
          ) : view === "/analytics" ? (
            <AnalyticsPanel overview={overview} onImport={username ? null : () => setDialog(true)} />
          ) : view === "/recommendations" ? (
            <RecommendationsPanel recommendations={recommendations} onImport={username ? null : () => setDialog(true)} />
          ) : view === "/daily-plan" ? (
            <DailyPlanPanel
              plan={dailyPlan}
              onGenerate={async (minutes) => {
                const result = await getDailyPlan(minutes);
                setDailyPlan(result.data.data);
              }}
            />
          ) : (
            <EmptyPanel type={view.slice(1)} onImport={username ? null : () => setDialog(true)} />
          )}
          {overview && (
            <p className="verified-note">
              Verified snapshot loaded: {overview.totalSolved} problems solved.
            </p>
          )}
          {overviewError && <p className="message error">{overviewError}</p>}
        </section>
      </main>
      {dialog && (
        <dialog open>
          <button className="dialog-close" onClick={() => setDialog(false)}>
            ×
          </button>
          <p className="eyebrow">PROFILE IMPORT</p>
          <h2>Bring your signal in.</h2>
          <p className="muted">
            Enter your LeetCode username. CodePulse will use a permitted
            provider and clearly mark anything unavailable.
          </p>
          <form onSubmit={submitImport}>
            <label>
              LeetCode username
              <input
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. vivek123"
              />
            </label>
            <button className="primary" type="submit">
              Request profile data <span>→</span>
            </button>
            <p className="message success">{message}</p>
          </form>
        </dialog>
      )}
    </div>
  );
}
