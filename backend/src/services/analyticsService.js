import { ProfileSnapshot } from "../models/ProfileSnapshot.js";
import { User } from "../models/User.js";
import { Problem } from "../models/Problem.js";

export const getOverview = async (userId) => {
  const user = await User.findById(userId).select("solvedProblems recentSolved topicStats solvedSyncedAt").lean();
  const solvedIds = [...new Set(
    (user?.solvedProblems || [])
      .map((item) => String(item.questionFrontendId || "").trim())
      .filter(Boolean),
  )];
  const solvedProblems = await Problem.find({
    questionFrontendId: { $in: solvedIds },
  })
    .select("questionFrontendId title titleSlug difficulty topicTags paidOnly")
    .lean();
  const enrichedProblems = solvedProblems.map((problem) => ({
    ...problem,
    difficulty: problem.difficulty || "",
    topicTags: problem.topicTags || [],
  }));
  const recentSlugs = [...new Set((user?.recentSolved || [])
    .map((submission) => String(submission.titleSlug || "").trim())
    .filter(Boolean))];
  const recentRanks = new Map(recentSlugs.map((slug, index) => [slug, index]));
  enrichedProblems.sort((first, second) => {
    const firstRecentRank = recentRanks.get(String(first.titleSlug || ""));
    const secondRecentRank = recentRanks.get(String(second.titleSlug || ""));
    if (firstRecentRank !== undefined || secondRecentRank !== undefined) {
      if (firstRecentRank === undefined) return 1;
      if (secondRecentRank === undefined) return -1;
      return firstRecentRank - secondRecentRank;
    }
    const firstIndex = solvedIds.indexOf(String(first.questionFrontendId));
    const secondIndex = solvedIds.indexOf(String(second.questionFrontendId));
    return firstIndex - secondIndex;
  });
  if (solvedIds.length) {
    const calculatedDifficultyStats = {
      total: solvedIds.length,
      easy: enrichedProblems.filter((problem) => String(problem.difficulty || "").toLowerCase() === "easy").length,
      medium: enrichedProblems.filter((problem) => String(problem.difficulty || "").toLowerCase() === "medium").length,
      hard: enrichedProblems.filter((problem) => String(problem.difficulty || "").toLowerCase() === "hard").length,
      unclassified: solvedIds.length - enrichedProblems.length,
    };
    const difficultyStats = calculatedDifficultyStats;
    const topicStats = user.topicStats instanceof Map
      ? Object.fromEntries(user.topicStats)
      : user.topicStats || {};
    return {
      totalSolved: solvedIds.length,
      difficultyStats,
      topicStats,
      solvedProblems: enrichedProblems,
      lastSyncedAt: user.solvedSyncedAt,
    };
  }
  const snapshot = await ProfileSnapshot.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
  return snapshot || {
    totalSolved: 0,
    difficultyStats: { total: 0, easy: 0, medium: 0, hard: 0 },
    topicStats: {},
    solvedProblems: [],
    lastSyncedAt: user?.solvedSyncedAt || null,
  };
};
