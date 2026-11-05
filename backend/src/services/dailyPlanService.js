import { DailyPlan } from "../models/DailyPlan.js";
import { ProfileSnapshot } from "../models/ProfileSnapshot.js";
import { Problem } from "../models/Problem.js";
import { User } from "../models/User.js";

const shuffle = (items) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
};

export const buildDailyPlan = async (userId, availableMinutes) => {
  const user = await User.findById(userId).select("solvedProblems topicStats totalSolved leetcodeUsername").lean();
  if (!user) return { availableMinutes, items: [], status: "user-not-found" };

  const snapshot = await ProfileSnapshot.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .select("totalSolved topics")
    .lean();
  const solvedIds = [...new Set((user.solvedProblems || [])
    .map((problem) => String(problem.questionFrontendId || "").trim())
    .filter(Boolean))];
  const storedTopics = Object.keys(user.topicStats || {});
  const snapshotTopics = (snapshot?.topics || []).map((topic) => topic.name).filter(Boolean);
  const practicedTopics = [...new Set([...storedTopics, ...snapshotTopics])];
  const totalSolved = Number(user.totalSolved || snapshot?.totalSolved || 0);
  if (!solvedIds.length && !practicedTopics.length && !totalSolved) {
    return { availableMinutes, items: [], status: "awaiting-profile-data" };
  }

  const candidates = await Problem.find({
    questionFrontendId: { $nin: solvedIds },
    ...(practicedTopics.length ? { "topicTags.name": { $in: practicedTopics } } : {}),
  })
    .select("questionFrontendId title titleSlug difficulty topicTags")
    .lean();
  const orderedCandidates = shuffle(candidates).sort((first, second) => {
    const firstMatch = (first.topicTags || []).some((tag) => practicedTopics.includes(tag.name));
    const secondMatch = (second.topicTags || []).some((tag) => practicedTopics.includes(tag.name));
    return Number(secondMatch) - Number(firstMatch);
  });

  const items = [];
  let remainingMinutes = availableMinutes;
  for (const problem of orderedCandidates) {
    const difficulty = String(problem.difficulty || "Medium").toLowerCase();
    const minutes = difficulty === "easy" ? 20 : difficulty === "hard" ? 40 : 30;
    if (minutes > remainingMinutes) continue;
    items.push({
      questionFrontendId: problem.questionFrontendId,
      title: problem.title,
      titleSlug: problem.titleSlug,
      difficulty: problem.difficulty,
      minutes,
      topic: problem.topicTags?.[0]?.name || "Practice",
    });
    remainingMinutes -= minutes;
    if (items.length === 5 || remainingMinutes < 20) break;
  }

  const status = items.length ? "ready" : "no-matching-problems";
  const plan = await DailyPlan.create({ user: userId, availableMinutes, items });
  return { id: plan.id, availableMinutes, items, status };
};
