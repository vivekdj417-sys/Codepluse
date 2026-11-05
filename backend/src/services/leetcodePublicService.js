import axios from "axios";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const REQUEST_TIMEOUT = 15_000;

const requestGraphQL = async (query, variables = {}) => {
  const response = await axios.post(
    LEETCODE_GRAPHQL_URL,
    { query, variables },
    {
      timeout: REQUEST_TIMEOUT,
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    },
  );

  if (response.status >= 400) {
    throw new Error(`LeetCode request failed with status ${response.status}`);
  }

  if (response.data?.errors?.length) {
    throw new Error(response.data.errors.map((error) => error.message).join("; "));
  }

  if (!response.data?.data) {
    throw new Error("LeetCode returned an empty response.");
  }

  return response.data.data;
};

const normalizeTagStats = (payload = []) => {
  const stats = {};
  for (const item of payload || []) {
    if (item?.tag && typeof item?.count === "number") {
      stats[item.tag] = item.count;
    }
  }
  return stats;
};

export const fetchLeetCodePublicData = async (username) => {
  const usernameQuery = `
    query getPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          realName
          userAvatar
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
      recentAcSubmissionList(username: $username, limit: 20) {
        title
        titleSlug
        timestamp
        lang
      }
      userCalendar(username: $username) {
        submissionCalendar
      }
      tagProblemCounts(username: $username) {
        tag {
          name
        }
        count
      }
    }
  `;

  const data = await requestGraphQL(usernameQuery, { username });
  const user = data.matchedUser;
  if (!user) throw new Error("LeetCode username not found.");

  const difficultyStats = {
    total: 0,
    easy: 0,
    medium: 0,
    hard: 0,
  };

  const totalStats = user.submitStatsGlobal?.acSubmissionNum || [];
  for (const item of totalStats) {
    const key = String(item.difficulty || "").toLowerCase();
    const count = Number(item.count || 0);
    difficultyStats.total += count;
    if (key === "easy") difficultyStats.easy = count;
    if (key === "medium") difficultyStats.medium = count;
    if (key === "hard") difficultyStats.hard = count;
  }

  const topicStats = {};
  for (const item of data.tagProblemCounts || []) {
    const tagName = item?.tag?.name || "Unknown";
    topicStats[tagName] = Number(item.count || 0);
  }

  return {
    username: user.username,
    ranking: Number(user.profile?.ranking || 0),
    difficultyStats,
    topicStats,
    recentSolved: (data.recentAcSubmissionList || []).map((submission) => ({
      title: submission.title,
      titleSlug: submission.titleSlug,
      timestamp: Number(submission.timestamp || 0),
      lang: submission.lang || "",
    })),
    calendar: data.userCalendar?.submissionCalendar || {},
  };
};
