const query = `
  query getSolvedProblems($filters: UserProgressQuestionListInput) {
    userProgressQuestionList(filters: $filters) {
      totalNum
      questions { frontendId }
    }
  }
`;

export const getAllSolvedQuestionIds = async () => {
  const questionIds = new Set();
  const limit = 100;
  let skip = 0;
  let expectedTotal = null;

  while (true) {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { filters: { questionStatus: "SOLVED", skip, limit } },
      }),
    });
    if (!response.ok) {
      throw new Error(`LeetCode request failed (HTTP ${response.status}).`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join("; "));
    }

    const result = payload.data?.userProgressQuestionList;
    if (!result || !Array.isArray(result.questions)) {
      throw new Error("LeetCode sign-in is required. Sign in to LeetCode, then retry the sync.");
    }

    expectedTotal ??= Number(result.totalNum) || 0;
    const ids = result.questions
      .map((problem) => String(problem.frontendId ?? "").trim())
      .filter(Boolean);
    if (!ids.length && skip === 0) {
      throw new Error("LeetCode returned no solved questions. Check your LeetCode sign-in.");
    }
    ids.forEach((id) => questionIds.add(id));
    skip += result.questions.length;

    if (result.questions.length < limit || (expectedTotal && skip >= expectedTotal)) break;
    if (skip > 5000) throw new Error("LeetCode returned more than 5,000 solved questions.");
  }

  return [...questionIds];
};

export const syncAllSolvedProblems = async (apiUrl, token) => {
  const solvedQuestionIds = await getAllSolvedQuestionIds();
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/leetcode/sync-solved`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ solvedQuestionIds }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || `CodePulse sync failed (HTTP ${response.status}).`);
  }
  return result;
};
