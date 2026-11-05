import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { copy } from "./appConfig.js";
import ProblemBoard from "./ProblemBoard.jsx";
import { topicIcon } from "../topicIcon.js";

export function EmptyPanel({ type, onImport }) {
  if (type === "dashboard")
    return (
      <>
        <div className="welcome-row">
          <div>
            <h2>Welcome to CodePulse.</h2>
            <p className="muted">
              Connect your profile to turn solved problems into a smarter
              practice loop.
            </p>
          </div>
          <span className="sync-badge">
            <i /> Data source ready
          </span>
        </div>
        <div className="empty-hero">
          <div className="pulse-ring">◒</div>
          <div>
            <p className="eyebrow">YOUR SIGNAL IS WAITING</p>
            <h2>
              Make your progress
              <br />
              <em>measurable.</em>
            </h2>
            <p className="muted">
              We only show analytics from data you explicitly import. No scraped
              or fabricated stats.
            </p>
            {onImport && (
              <button className="primary" onClick={onImport}>
                Connect a username <span>→</span>
              </button>
            )}
          </div>
        </div>
        <div className="section-head">
          <div>
            <p className="eyebrow">WHAT YOU WILL SEE</p>
            <h2>A clearer next problem.</h2>
          </div>
        </div>
        <div className="preview-grid">
          {[
            [
              "↗",
              "Progress snapshots",
              "Watch your solved count and consistency compound over time.",
            ],
            [
              "⌁",
              "Weak-topic signals",
              "Find the concepts where focused repetition creates lift.",
            ],
            [
              "✦",
              "Useful recommendations",
              "Get practice suggestions matched to your current level.",
            ],
          ].map(([icon, title, text]) => (
            <article key={title}>
              <span className="icon blue">{icon}</span>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </article>
          ))}
        </div>
      </>
    );
  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">{type.toUpperCase()}</p>
          <h2>{copy[`/${type}`][1]}</h2>
        </div>
      </div>
      <div className="chart-empty">
        <span>
          {type === "recommendations"
            ? "✦"
            : type === "progress"
              ? "↗"
              : type === "daily-plan"
                ? "◷"
                : "⌁"}
        </span>
        <h3>
          {type === "analytics"
            ? "Your analytics will appear here"
            : copy[`/${type}`][1]}
        </h3>
        <p className="muted">
          {type === "analytics"
            ? "Import verified profile data to unlock topic, difficulty, progress, and contest analysis."
            : "Connect a profile so CodePulse can personalize this view from verified data."}
        </p>
        {onImport && (
          <button className="secondary" onClick={onImport}>
            Import profile
          </button>
        )}
      </div>
    </>
  );
}

export function OverviewPanel({ overview, profile, onImport }) {
  const fallbackProblems = (profile?.problems || []).map((problem) => ({
    _id: problem.frontendId || problem.questionFrontendId || problem.titleSlug || problem.title,
    questionFrontendId: String(problem.frontendId ?? problem.questionFrontendId ?? ""),
    title: problem.title,
    titleSlug: problem.titleSlug,
    difficulty: problem.difficulty || "Unknown",
    topicTags: Array.isArray(problem.topics)
      ? problem.topics.map((topic) => ({ name: topic }))
      : (problem.topicTags || []),
  })).filter((problem) => problem.questionFrontendId);

  const solvedProblems = overview?.solvedProblems?.length ? overview.solvedProblems : fallbackProblems;
  if (!solvedProblems.length) {
    return <EmptyPanel type="dashboard" onImport={onImport} />;
  }

  const difficultySource = overview?.difficultyStats || {};
  const derivedDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const problem of solvedProblems) {
    const level = String(problem.difficulty || "").toLowerCase();
    if (level in derivedDifficulty) derivedDifficulty[level] += 1;
  }
  const difficulty = Object.keys(difficultySource).length ? difficultySource : derivedDifficulty;

  const topicSource = overview?.topicStats || profile?.topics || {};
  const topics = Object.entries(topicSource)
    .map(([topic, value]) => [topic, typeof value === "number" ? value : (value?.total ?? 0)])
    .sort(([, first], [, second]) => second - first)
    .slice(0, 6);

  const totalSolved = overview?.totalSolved ?? solvedProblems.length;
  const difficultyValues = [
    Number(difficulty.easy || 0),
    Number(difficulty.medium || 0),
    Number(difficulty.hard || 0),
  ];
  const maxDifficultyValue = Math.max(1, ...difficultyValues, totalSolved);

  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">YOUR OVERVIEW</p>
          <h2>Your solved problem signal.</h2>
          <p className="muted">Synced from your LeetCode account.</p>
        </div>
        <span className="sync-badge"><i /> {totalSolved} solved</span>
      </div>
      {Number(difficulty.unclassified || 0) > 0 && (
        <p className="verified-note">
          {difficulty.unclassified} solved question{difficulty.unclassified === 1 ? " is" : "s are"} not in our problem catalog yet, so difficulty and topic breakdowns exclude {difficulty.unclassified === 1 ? "it" : "them"}.
        </p>
      )}
      <div className="stats-grid">
        <article className="stat-card">
          <span className="eyebrow">TOTAL SOLVED</span>
          <strong>{totalSolved}</strong>
        </article>
        {[["Easy", difficulty.easy], ["Medium", difficulty.medium], ["Hard", difficulty.hard]].map(([label, value]) => {
          const numericValue = Number(value || 0);
          const fillWidth = Math.max(0, Math.min(100, (numericValue / maxDifficultyValue) * 100));
          return (
            <article className="stat-card" key={label}>
              <span className="eyebrow">{label}</span>
              <strong>{numericValue}</strong>
              <div style={{ marginTop: 12, width: "100%" }}>
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
                >
                  <div
                    style={{
                      width: `${fillWidth}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: label === "Easy" ? "#f3f3f3" : label === "Medium" ? "#d3d6da" : "#9da4ad",
                      transition: "width 0.25s ease",
                    }}
                  />
                </div>
                <small style={{ display: "block", marginTop: 6, color: "#a8adb5" }}>
                  {numericValue} / {maxDifficultyValue}
                </small>
              </div>
            </article>
          );
        })}
      </div>
      {topics.length > 0 && (
        <>
          <div className="section-head">
            <div>
              <p className="eyebrow">TOP TOPICS</p>
              <h2>Where you are practicing.</h2>
            </div>
          </div>
          <div className="preview-grid">
            {topics.map(([topic, count]) => (
              <article className="topic-card" key={topic}>
                <span className="icon topic-icon" aria-hidden="true">{topicIcon(topic)}</span>
                <h3>{topic}</h3>
                <p className="muted">{count} solved problem{count === 1 ? "" : "s"}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function AnalyticsPanel({ overview, onImport }) {
  if (!overview?.solvedProblems?.length) return <EmptyPanel type="analytics" onImport={onImport} />;
  const topics = Object.entries(overview.topicStats || {})
    .map(([topic, count]) => ({ topic, count: Number(count || 0) }))
    .filter(({ count }) => count > 0)
    .sort((first, second) => second.count - first.count);

  const chartData = topics.slice(0, 20);

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">ANALYTICS</p>
          <h2>Your solved problem signal.</h2>
        </div>
        <span className="sync-badge"><i /> {overview.totalSolved} solved</span>
      </div>
      <div className="stats-grid">
        {[
          ["Total solved", overview.totalSolved],
          ["Easy", overview.difficultyStats?.easy],
          ["Medium", overview.difficultyStats?.medium],
          ["Hard", overview.difficultyStats?.hard],
        ].map(([label, count]) => (
          <article className="stat-card" key={label}>
            <span className="eyebrow">{label}</span>
            <strong>{count || 0}</strong>
          </article>
        ))}
      </div>

      {chartData.length > 0 && (
        <>
          <div className="section-head">
            <div>
              <p className="eyebrow">TOPICS</p>
              <h2>Topic breakdown</h2>
            </div>
          </div>
              <div className="topic-chart" style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 16, left: 4, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis
                      dataKey="topic"
                      angle={-30}
                      textAnchor="end"
                      height={90}
                      interval="preserveStartEnd"
                      tick={{ fontSize: 10, fill: "#dfe3e8" }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: "#dfe3e8" }} />
                    <Tooltip
                  contentStyle={{
                    background: "#111315",
                    border: "1px solid #30353a",
                    borderRadius: 10,
                    color: "#f5f5f5",
                  }}
                />
                <Bar dataKey="count" fill="#63d9ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="preview-grid">
        {topics.slice(0, 6).map(({ topic, count }) => (
          <article className="topic-card" key={topic}>
            <span className="icon topic-icon" aria-hidden="true">{topicIcon(topic)}</span>
            <h3>{topic}</h3>
            <p className="muted">{count} solved problem{count === 1 ? "" : "s"}</p>
          </article>
        ))}
      </div>
      <div className="section-head">
        <div><p className="eyebrow">SOLVED LIST</p><h2>Recently catalogued problems.</h2></div>
      </div>
      <ProblemBoard problems={overview.solvedProblems} />
    </>
  );
}

export function RecommendationsPanel({ recommendations, onImport }) {
  if (!recommendations) {
    return <div className="section-head"><h2>Loading recommendations...</h2></div>;
  }
  if (!recommendations?.data?.length) {
    return (
      <>
        <EmptyPanel type="recommendations" onImport={null} />
        {recommendations?.message && <p className="message">{recommendations.message}</p>}
      </>
    );
  }

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">RECOMMENDATIONS</p>
          <h2>Ten problems close to your practice.</h2>
          <p className="muted">Random unsolved problems from topics you have already explored.</p>
        </div>
        <span className="sync-badge"><i /> {recommendations.data.length} problems</span>
      </div>
      <ProblemBoard problems={recommendations.data} mode="recommendation" />
    </>
  );
}

export function DailyPlanPanel({ plan, onGenerate }) {
  const [minutes, setMinutes] = useState(60);
  const [loading, setLoading] = useState(false);

  const generate = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await onGenerate(minutes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">DAILY PLAN</p>
          <h2>A focused session for today.</h2>
          <p className="muted">A practical set of unsolved problems from topics you already practice.</p>
        </div>
      </div>
      <form className="daily-plan-form" onSubmit={generate}>
        <label>
          Available minutes
          <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
            <option value="120">120 minutes</option>
            <option value="180">180 minutes</option>
          </select>
        </label>
        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Building plan..." : "Build today's plan"} <span>→</span>
        </button>
      </form>
      {!plan ? (
        <div className="chart-empty"><h3>Choose your time and build a plan.</h3></div>
      ) : !plan.items?.length ? (
        <div className="chart-empty">
          <h3>{plan.status === "awaiting-profile-data" ? "Complete your LeetCode sync first." : "No matching problems yet."}</h3>
          <p className="muted">{plan.status === "awaiting-profile-data" ? "Your daily plan will appear after your solved problems are synced." : "Add more problems to the catalog or practice another topic."}</p>
        </div>
      ) : (
        <ProblemBoard
          problems={plan.items.map((problem) => ({
            ...problem,
            topicTags: problem.topic ? [{ name: problem.topic }] : [],
          }))}
          mode="plan"
        />
      )}
    </>
  );
}
