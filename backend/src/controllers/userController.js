import { fetchLeetCodeData } from "../services/leetcodeService.js";
import { User } from "../models/User.js";
import { Problem } from "../models/Problem.js";
import { text } from "../utils/validation.js";

const syncImportedProblems = async (userId, problems, username = null) => {
  const ids = [...new Set((problems || [])
    .map((problem) => String(problem.frontendId ?? problem.questionFrontendId ?? "").trim())
    .filter(Boolean))];
  if (!ids.length) return 0;

  const catalogProblems = await Problem.find({ questionFrontendId: { $in: ids } }).lean();
  if (!catalogProblems.length) return 0;

  const syncedAt = new Date();
  const user = await User.findById(userId);
  if (!user) return 0;

  const isSwitchingAccount = Boolean(username) && Boolean(user.leetcodeUsername) && user.leetcodeUsername !== username;
  const currentMap = new Map();
  if (!isSwitchingAccount) {
    for (const item of user.solvedProblems || []) {
      currentMap.set(String(item.questionFrontendId), item);
    }
  }
  for (const problem of catalogProblems) {
    currentMap.set(String(problem.questionFrontendId), {
      questionFrontendId: problem.questionFrontendId,
      title: problem.title,
      problem: problem._id,
      syncedAt,
    });
  }

  user.solvedProblems = Array.from(currentMap.values());

  const uniqueProblemIds = [...new Set((user.solvedProblems || []).map((item) => String(item.problem)).filter(Boolean))];
  const uniqueProblems = uniqueProblemIds.length
    ? await Problem.find({ _id: { $in: uniqueProblemIds } }).lean()
    : [];

  const topicStats = {};
  const difficultyStats = { easy: 0, medium: 0, hard: 0 };
  for (const problem of uniqueProblems) {
    const difficulty = String(problem.difficulty || "").toLowerCase();
    if (difficulty in difficultyStats) difficultyStats[difficulty] += 1;
    for (const tag of problem.topicTags || []) topicStats[tag.name] = (topicStats[tag.name] || 0) + 1;
  }

  user.topicStats = topicStats;
  user.difficultyStats = difficultyStats;
  user.totalSolved = uniqueProblems.length;
  user.solvedSyncedAt = syncedAt;
  await user.save();
  return uniqueProblems.length;
};

export const getProfile = async (request, response) => {
  const user = await User.findById(request.user.id)
    .select("name email leetcodeUsername")
    .lean();
  if (!user) return response.status(404).json({ message: "User not found." });
  return response.json({ user });
};

export const importProfile = async (request, response) => {
  try {
  const username = request.body?.username?.trim();
  if (!text(username, 50))
    return response
      .status(400)
      .json({ message: "A valid LeetCode username is required." });
  const linkedToAnotherAccount = await User.findOne({
    leetcodeUsername: username,
    _id: { $ne: request.user.id },
  }).select("email").lean();
  if (linkedToAnotherAccount) {
    return response.status(409).json({
      message: "This LeetCode username is already linked to another CodePulse account.",
    });
  }
  await User.findByIdAndUpdate(
    request.user.id,
    { leetcodeUsername: username },
    { runValidators: true },
  );

  const data = await fetchLeetCodeData(username);
  const { problems, topics, ...profileData } = data;
  void profileData;
  void topics;
  const syncedProblems = await syncImportedProblems(request.user.id, problems, username);
  await User.findByIdAndUpdate(request.user.id, {
    recentSolved: data.recentSubmissions || [],
  });

  return response.json({
    username,
    source: "leetcode",
    stale: false,
    syncedProblems,
    requiresSolvedSync: false,
  });
  } catch (error) {
    console.error("LeetCode profile import failed:", error);
    if (error.code === 11000) {
      return response.status(409).json({
        message: "This LeetCode username is already linked to another CodePulse account.",
      });
    }
    return response.status(502).json({ message: error.message || "Unable to fetch LeetCode profile." });
  }
};
