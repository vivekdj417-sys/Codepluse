export const views = [
  { path: "/analytics", icon: "⌁", label: "Analytics" },
  { path: "/dashboard", icon: "◈", label: "Overview" },
  { path: "/recommendations", icon: "✦", label: "Recommendations" },
  { path: "/daily-plan", icon: "◷", label: "Daily plan" },
];
export const copy = {
  "/dashboard": ["Your practice, in focus.", "Welcome to CodePulse."],
  "/analytics": ["See the pattern, then act.", "Performance overview."],
  "/recommendations": [
    "Practice with intent.",
    "Recommendations need your pattern first.",
  ],
  "/daily-plan": ["Show up, deliberately.", "Your plan will be personalized."],
};

export const leetCodeProblemUrl = (problem) => {
  const slug = problem.titleSlug || String(problem.title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://leetcode.com/problems/${slug}/description/`;
};
