import { useEffect, useState } from "react";
import { getOverview } from "../api.js";
import { topicIcon } from "../topicIcon.js";

const leetCodeProblemUrl = (problem) => {
  const slug = problem.titleSlug || String(problem.title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://leetcode.com/problems/${slug}/description/`;
};

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getOverview();
        setOverview(response.data.data);
      } catch (error) {
        setOverview(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="section-head"><h2>Loading analytics...</h2></div>;
  if (!overview || !overview.totalSolved) {
    return (
      <div className="empty-hero">
        <h2>No LeetCode data yet.</h2>
        <p className="muted">Connect LeetCode to see solved counts, difficulty stats, and recent submissions.</p>
      </div>
    );
  }

  const topics = Object.entries(overview.topicStats || {})
    .map(([topic, value]) => [topic, typeof value === "number" ? value : (value?.total ?? 0)])
    .sort(([, first], [, second]) => second - first)
    .slice(0, 10);

  return (
    <div>
      <div className="section-head">
        <div><p className="eyebrow">ANALYTICS</p><h2>Your progress at a glance.</h2></div>
      </div>
      <div className="stats-grid">
        <article className="stat-card"><span className="eyebrow">Total Solved</span><strong>{overview.totalSolved}</strong></article>
        <article className="stat-card"><span className="eyebrow">Easy</span><strong>{overview.difficultyStats?.easy || 0}</strong></article>
        <article className="stat-card"><span className="eyebrow">Medium</span><strong>{overview.difficultyStats?.medium || 0}</strong></article>
        <article className="stat-card"><span className="eyebrow">Hard</span><strong>{overview.difficultyStats?.hard || 0}</strong></article>
      </div>

      <div className="section-head">
        <div><p className="eyebrow">TOPICS</p><h2>Most solved topics</h2></div>
      </div>
      <div className="preview-grid">
        {topics.map(([topic, count]) => (
          <article className="topic-card" key={topic}>
            <span className="icon topic-icon" aria-hidden="true">{topicIcon(topic)}</span>
            <h3>{topic}</h3>
            <p className="muted">{count} solved</p>
          </article>
        ))}
      </div>

      <div className="section-head">
        <div><p className="eyebrow">RECENT</p><h2>Recent submissions</h2></div>
      </div>
      <div className="preview-grid">
        {(overview.solvedProblems || []).slice(0, 10).map((problem) => (
          <article key={problem._id || problem.questionFrontendId}>
            <span className="eyebrow">{problem.difficulty}</span>
            <h3>
              <a href={leetCodeProblemUrl(problem)} target="_blank" rel="noreferrer">
                {problem.questionFrontendId}. {problem.title}
              </a>
            </h3>
            <p className="muted">{(problem.topicTags || []).map((tag) => tag.name || tag).join(", ") || "No tags"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
