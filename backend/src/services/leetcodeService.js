import axios from "axios";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const REQUEST_TIMEOUT = 10_000;

const profileQuery = `
  query getLeetCodeProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile { realName userAvatar ranking school company jobTitle websites }
      githubUrl
      linkedinUrl
      twitterUrl
      submitStatsGlobal { acSubmissionNum { difficulty count submissions } totalSubmissionNum { difficulty count submissions } }
      badges { name icon creationDate }
    }
    userContestRanking(username: $username) { attendedContestsCount rating globalRanking }
    userContestRankingHistory(username: $username) { attended contest { title startTime } rating ranking }
  }
`;

const progressQuery = `
  query getProgress($userSlug: String!) {
    userProfileUserQuestionProgressV2(userSlug: $userSlug) {
      numAcceptedQuestions { count difficulty }
    }
  }
`;

const recentSubmissionsQuery = `
  query getRecentAcceptedSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) { title titleSlug timestamp lang }
  }
`;

const solvedProblemsQuery = `
  query getSolvedProblems($limit: Int!, $skip: Int!) {
    problemsetQuestionListV2(limit: $limit, skip: $skip, filters: { status: AC, filterCombineType: ALL }) {
      questions {
        questionFrontendId
        title
        titleSlug
        difficulty
        topicTags { name slug }
      }
    }
  }
`;

const requestGraphQL = async (query, variables) => {
  const response = await axios.post(
    LEETCODE_GRAPHQL_URL,
    { query, variables },
    { timeout: REQUEST_TIMEOUT, headers: { "Content-Type": "application/json" } },
  );
  if (process.env.DEBUG_LEETCODE_GRAPHQL === "true") {
    console.dir({ responseData: response.data, graphQLData: response.data?.data }, { depth: null });
  }
  if (response.data?.errors?.length) {
    throw new Error(response.data.errors.map((error) => error.message).join("; "));
  }
  if (!response.data?.data) throw new Error("LeetCode returned an empty response");
  return response.data.data;
};

const calculateStreaks = (calendar) => {
  const days = Object.entries(calendar)
    .filter(([, count]) => Number(count) > 0)
    .map(([timestamp]) => new Date(Number(timestamp) * 1000).toISOString().slice(0, 10))
    .sort();
  let current = 0;
  let longest = 0;
  let previous;
  for (const day of days) {
    const date = new Date(`${day}T00:00:00Z`);
    const isConsecutive = previous && date - previous === 86_400_000;
    current = isConsecutive ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }
  return { currentStreak: current, longestStreak: longest };
};

const getAllSolvedProblems = async () => {
  const problems = [];
  const limit = 100;
  for (let skip = 0; ; skip += limit) {
    const data = await requestGraphQL(solvedProblemsQuery, { limit, skip });
    const result = data.problemsetQuestionListV2;
    const batch = result?.questions || [];
    if (!batch.length && !problems.length) {
      throw new Error("LeetCode returned no solved problems. Open LeetCode and sign in first.");
    }
    problems.push(...batch);
    if (batch.length < limit) break;
  }
  return problems.map((problem) => ({
    frontendId: String(problem.questionFrontendId),
    title: problem.title,
    titleSlug: problem.titleSlug,
    difficulty: problem.difficulty,
    topics: (problem.topicTags || []).map((tag) => tag.name),
  }));
};

const calculateTopics = (problems) => problems.reduce((topics, problem) => {
  for (const topic of problem.topics || []) {
    topics[topic] ||= { total: 0, easy: 0, medium: 0, hard: 0 };
    topics[topic].total += 1;
    const difficulty = String(problem.difficulty || "").toLowerCase();
    if (difficulty in topics[topic]) topics[topic][difficulty] += 1;
  }
  return topics;
}, {});

export const fetchLeetCodeData = async (username) => {
  const [profileData, progressData, recentData] = await Promise.all([
    requestGraphQL(profileQuery, { username }),
    requestGraphQL(progressQuery, { userSlug: username }),
    requestGraphQL(recentSubmissionsQuery, { username, limit: 20 }),
  ]);
  let problems = [];
  let problemsSyncError = null;
  try {
    problems = await getAllSolvedProblems();
  } catch (error) {
    problemsSyncError = error.message;
  }
  const user = profileData.matchedUser;
  if (!user) throw new Error("LeetCode username not found");
  const calendar = {};
  const solvedStats = user.submitStatsGlobal?.acSubmissionNum || [];
  const allStats = user.submitStatsGlobal?.totalSubmissionNum || [];
  const progressStats = progressData.userProfileUserQuestionProgressV2?.numAcceptedQuestions || [];
  const stat = (stats, difficulty) => stats.find((item) => String(item.difficulty).toUpperCase() === difficulty.toUpperCase())?.count || 0;
  const topics = calculateTopics(problems);
  return {
    username: user.username,
    profile: { realName: user.profile?.realName, avatar: user.profile?.userAvatar, ranking: user.profile?.ranking, school: user.profile?.school, company: user.profile?.company, jobTitle: user.profile?.jobTitle, githubUrl: user.githubUrl, linkedinUrl: user.linkedinUrl, twitterUrl: user.twitterUrl, websites: user.profile?.websites || [] },
    solved: { total: progressStats.reduce((total, item) => total + Number(item.count || 0), 0), easy: stat(progressStats, "EASY"), medium: stat(progressStats, "MEDIUM"), hard: stat(progressStats, "HARD") },
    submissions: { total: stat(allStats, "All"), accepted: stat(solvedStats, "All"), easy: stat(allStats, "Easy"), medium: stat(allStats, "Medium"), hard: stat(allStats, "Hard") },
    problems,
    topics,
    problemsSyncError,
    calendar: { submissionCalendar: calendar, dailySubmissions: calendar, ...calculateStreaks(calendar) },
    recentSubmissions: recentData.recentAcSubmissionList || [],
    contest: { ranking: profileData.userContestRanking?.globalRanking, rating: profileData.userContestRanking?.rating, attendedContests: profileData.userContestRanking?.attendedContestsCount, history: profileData.userContestRankingHistory || [] },
    badges: user.badges || [],
  };
};

export const fetchRecentAcceptedSubmissions = async (username) => {
  const data = await requestGraphQL(recentSubmissionsQuery, { username, limit: 20 });
  return data.recentAcSubmissionList || [];
};

export const requestProfileImport = async (username) => ({
  username,
  status: "queued",
  message: "LeetCode profile import queued.",
});

export { REQUEST_TIMEOUT };
