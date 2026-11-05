import { leetCodeProblemUrl } from "./appConfig.js";

export default function ProblemBoard({ problems, mode = "solved" }) {
  return (
    <div className={`problem-board problem-board-${mode}`}>
      {problems.map((problem, index) => {
        const tags = (problem.topicTags || []).map((tag) => tag.name || tag).filter(Boolean);
        const difficulty = String(problem.difficulty || "Unknown").toLowerCase();
        return (
          <article className="problem-row" key={problem._id || problem.questionFrontendId || problem.title}>
            <span className="problem-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="problem-main">
              <div className="problem-title-line">
                <span className={`difficulty-dot difficulty-${difficulty}`} />
                <span className="problem-id">#{problem.questionFrontendId || "--"}</span>
                <h3>{problem.title}</h3>
              </div>
              <div className="problem-meta">
                <span className={`difficulty-label difficulty-text-${difficulty}`}>{problem.difficulty || "Unknown"}</span>
                {mode === "plan" && problem.minutes && <span>{problem.minutes} min focus</span>}
                {tags.slice(0, 3).map((tag) => <span className="topic-chip" key={tag}>{tag}</span>)}
              </div>
            </div>
            <a className="problem-open" href={leetCodeProblemUrl(problem)} target="_blank" rel="noreferrer" aria-label={`Open ${problem.title}`}>
              <span>Open</span> <b>↗</b>
            </a>
          </article>
        );
      })}
    </div>
  );
}
