import { User } from "../models/User.js";
import { Problem } from "../models/Problem.js";
import { fetchLeetCodeData, fetchRecentAcceptedSubmissions } from "../services/leetcodeService.js";
import { fetchLeetCodePublicData } from "../services/leetcodePublicService.js";

export const importUsernameQuickSync = async (request, response) => {
  const username = request.body?.username?.trim();
  if (!username) return response.status(400).json({ message: "Username is required." });

  try {
    const data = await fetchLeetCodePublicData(username);
    const user = await User.findById(request.user.id);
    if (!user) return response.status(404).json({ message: "User not found." });

    user.leetcodeUsername = username;
    user.ranking = Number(data.ranking || 0);
    user.difficultyStats = data.difficultyStats;
    user.topicStats = data.topicStats;
    user.recentSolved = data.recentSolved;
    user.calendar = data.calendar;
    user.lastSyncedAt = new Date();
    user.solvedSyncedAt = user.lastSyncedAt;
    user.fullSyncComplete = Boolean(user.fullSyncComplete);
    await user.save();

    return response.json({
      username,
      ranking: user.ranking,
      difficultyStats: user.difficultyStats,
      topicStats: user.topicStats,
      recentSolved: user.recentSolved,
      calendar: user.calendar,
      lastSyncedAt: user.lastSyncedAt,
    });
  } catch (error) {
    return response.status(502).json({
      message: "Unable to import LeetCode profile from username.",
      error: error.message,
    });
  }
};

export const syncFullSolvedProblems = async (request, response) => {
  const solvedProblems = Array.isArray(request.body?.solvedProblems) ? request.body.solvedProblems : [];
  if (!solvedProblems.length) {
    return response.status(400).json({ message: "solvedProblems must be a non-empty array." });
  }

  try {
    const user = await User.findById(request.user.id);
    if (!user) return response.status(404).json({ message: "User not found." });

    const normalized = solvedProblems
      .map((problem) => ({
        questionFrontendId: String(problem.questionFrontendId ?? problem.frontendId ?? "").trim(),
        title: String(problem.title || "").trim(),
        titleSlug: String(problem.titleSlug || "").trim(),
        difficulty: String(problem.difficulty || "").trim(),
        topicTags: Array.isArray(problem.topicTags)
          ? problem.topicTags.map((tag) => ({ name: String(tag.name || tag), slug: String(tag.slug || "") }))
          : [],
      }))
      .filter((problem) => problem.questionFrontendId && problem.title);

    if (!normalized.length) {
      return response.status(400).json({ message: "No valid solved problems received." });
    }

    const map = new Map((user.solvedProblems || []).map((item) => [String(item.questionFrontendId), item]));
    for (const problem of normalized) {
      const problemDoc = await Problem.findOne({ questionFrontendId: problem.questionFrontendId }).lean();
      map.set(problem.questionFrontendId, {
        questionFrontendId: problem.questionFrontendId,
        title: problem.title,
        problem: problemDoc?._id || null,
        syncedAt: new Date(),
      });
    }

    const merged = Array.from(map.values()).filter((item) => item.questionFrontendId);
    const currentProblems = await Problem.find({
      questionFrontendId: { $in: merged.map((item) => item.questionFrontendId) },
    }).lean();

    const topicStats = {};
    const difficultyStats = { total: merged.length, easy: 0, medium: 0, hard: 0, unclassified: 0 };
    for (const problem of currentProblems) {
      const difficultyKey = String(problem.difficulty || "").toLowerCase();
      if (["easy", "medium", "hard"].includes(difficultyKey)) difficultyStats[difficultyKey] += 1;
      for (const tag of problem.topicTags || []) {
        topicStats[tag.name] = (topicStats[tag.name] || 0) + 1;
      }
    }
    difficultyStats.unclassified = merged.length - currentProblems.length;

    user.solvedProblems = merged;
    user.topicStats = topicStats;
    user.difficultyStats = difficultyStats;
    user.totalSolved = merged.length;
    user.fullSyncComplete = true;
    user.solvedSyncedAt = new Date();
    user.lastSyncedAt = user.solvedSyncedAt;
    await user.save();

    return response.json({
      totalSolved: merged.length,
      difficultyStats,
      topicStats,
      fullSyncComplete: true,
      syncedAt: user.solvedSyncedAt,
    });
  } catch (error) {
    return response.status(502).json({
      message: "Unable to sync full solved problem list.",
      error: error.message,
    });
  }
};

export const getSolvedProblemNumbers = async (request, response) => {
  const username = request.params.username?.trim();
  if (!username) return response.status(400).json({ message: "Username is required." });

  try {
    const data = await fetchLeetCodeData(username);
    const rawSolvedIds = (data.problems || [])
      .map((problem) => String(problem.frontendId ?? problem.questionFrontendId ?? "").trim())
      .filter(Boolean);

    const solvedProblemNumbers = [...new Set(rawSolvedIds)];
    const catalogProblems = await Problem.find({
      questionFrontendId: { $in: solvedProblemNumbers },
    })
      .select("questionFrontendId title difficulty")
      .sort({ questionFrontendId: 1 })
      .lean();

    const matchedNumbers = catalogProblems.map((problem) => String(problem.questionFrontendId));

    return response.json({
      username,
      totalSolvedFromLeetCode: solvedProblemNumbers.length,
      totalMatchedInCatalog: matchedNumbers.length,
      solvedProblemNumbers: matchedNumbers,
      solvedProblems: catalogProblems.map((problem) => ({
        questionFrontendId: problem.questionFrontendId,
        title: problem.title,
        difficulty: problem.difficulty,
      })),
    });
  } catch (error) {
    return response.status(502).json({
      message: "Unable to fetch solved problem numbers.",
      error: error.message,
    });
  }
};

export const syncSolvedProblems = async (request, response) => {
  const submittedIds = request.body?.solvedQuestionIds;
  if (!Array.isArray(submittedIds)) {
    return response.status(400).json({ message: "solvedQuestionIds must be an array." });
  }
  const questionIds = [...new Set(submittedIds.map((id) => String(id).trim()).filter(Boolean))];
  if (!questionIds.length) return response.status(400).json({ message: "At least one solved problem ID is required." });
  if (questionIds.length > 5000) return response.status(400).json({ message: "Too many solved problem IDs." });

  const problems = await Problem.find({ questionFrontendId: { $in: questionIds } }).lean();
  const user = await User.findById(request.user.id);
  if (!user) return response.status(404).json({ message: "User not found." });

  const problemById = new Map(problems.map((problem) => [String(problem.questionFrontendId), problem]));
  const previousIds = new Set((user.solvedProblems || []).map((item) => String(item.questionFrontendId)));
  const solvedById = new Map(
    (user.solvedProblems || []).map((item) => [String(item.questionFrontendId), item]),
  );
  const syncedAt = new Date();
  for (const questionFrontendId of questionIds) {
    const problem = problemById.get(questionFrontendId);
    solvedById.set(questionFrontendId, {
      questionFrontendId,
      title: problem?.title || `Problem #${questionFrontendId} (not in catalog)`,
      problem: problem?._id || null,
      syncedAt,
    });
  }
  const mergedProblems = [...solvedById.values()];
  const allProblems = await Problem.find({
    questionFrontendId: { $in: mergedProblems.map((item) => item.questionFrontendId) },
  }).lean();
  const topicStats = {};
  const difficultyStats = {
    total: mergedProblems.length,
    easy: 0,
    medium: 0,
    hard: 0,
    unclassified: mergedProblems.length - allProblems.length,
  };
  for (const problem of allProblems) {
    const difficulty = String(problem.difficulty || "").toLowerCase();
    if (difficulty in difficultyStats && difficulty !== "total") difficultyStats[difficulty] += 1;
    for (const tag of problem.topicTags || []) topicStats[tag.name] = (topicStats[tag.name] || 0) + 1;
  }
  user.solvedProblems = mergedProblems;
  user.topicStats = topicStats;
  user.difficultyStats = difficultyStats;
  user.totalSolved = mergedProblems.length;
  user.solvedSyncedAt = syncedAt;
  user.lastSyncedAt = syncedAt;
  user.fullSyncComplete = true;
  await user.save();

  return response.json({
    totalSolved: mergedProblems.length,
    submittedCount: questionIds.length,
    matchedCount: problems.length,
    difficultyStats,
    topicStats,
    recentlySynced: questionIds.filter((id) => !previousIds.has(id)).length,
    missingCount: questionIds.length - problems.length,
    lastSyncedAt: syncedAt,
  });
};

export const listProblemCatalog = async (_request, response) => {
  const problems = await Problem.find({})
    .select("questionFrontendId title titleSlug difficulty topicTags paidOnly")
    .lean();
  problems.sort((first, second) => Number(first.questionFrontendId) - Number(second.questionFrontendId));
  return response.json({ data: problems, total: problems.length });
};

export const syncRecentSolvedProblems = async (request, response) => {
  try {
    const user = await User.findById(request.user.id);
    if (!user) return response.status(404).json({ message: "User not found." });
    if (!user.leetcodeUsername || !user.solvedProblems?.length) {
      return response.json({ requiresFullSync: true, added: 0, message: "Full LeetCode sync is required." });
    }

    const recentSubmissions = await fetchRecentAcceptedSubmissions(user.leetcodeUsername);
    user.recentSolved = recentSubmissions;
    const slugs = [...new Set(recentSubmissions.map((submission) => submission.titleSlug).filter(Boolean))];
    if (!slugs.length) {
      await user.save();
      return response.json({ requiresFullSync: false, added: 0, checked: 0 });
    }

    const catalogProblems = await Problem.find({ titleSlug: { $in: slugs } }).lean();
    const solvedIds = new Set((user.solvedProblems || []).map((problem) => String(problem.questionFrontendId)));
    const syncedAt = new Date();
    const newProblems = catalogProblems.filter((problem) => !solvedIds.has(String(problem.questionFrontendId)));
    if (newProblems.length) {
      user.solvedProblems.push(...newProblems.map((problem) => ({
        questionFrontendId: problem.questionFrontendId,
        title: problem.title,
        problem: problem._id,
        syncedAt,
      })));
    }

    const allSolvedProblems = await Problem.find({
      questionFrontendId: { $in: user.solvedProblems.map((problem) => problem.questionFrontendId) },
    }).lean();
    const topicStats = {};
    const difficultyStats = {
      total: user.solvedProblems.length,
      easy: 0,
      medium: 0,
      hard: 0,
      unclassified: user.solvedProblems.length - allSolvedProblems.length,
    };
    for (const problem of allSolvedProblems) {
      const difficulty = String(problem.difficulty || "").toLowerCase();
      if (["easy", "medium", "hard"].includes(difficulty)) difficultyStats[difficulty] += 1;
      for (const tag of problem.topicTags || []) topicStats[tag.name] = (topicStats[tag.name] || 0) + 1;
    }
    user.topicStats = topicStats;
    user.difficultyStats = difficultyStats;
    user.totalSolved = user.solvedProblems.length;
    user.solvedSyncedAt = syncedAt;
    user.lastSyncedAt = syncedAt;
    user.fullSyncComplete = true;
    await user.save();

    return response.json({ requiresFullSync: false, added: newProblems.length, checked: slugs.length, totalSolved: user.solvedProblems.length });
  } catch (error) {
    return response.status(502).json({ message: "Unable to sync recent LeetCode submissions.", error: error.message });
  }
};