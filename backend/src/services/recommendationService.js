import { Problem } from "../models/Problem.js";
import { User } from "../models/User.js";

export const getRecommendations = async (userId) => {
	const user = await User.findById(userId).select("solvedProblems").lean();
	if (!user) return { topics: [], data: [], message: "User not found." };

	const solvedIds = [...new Set((user.solvedProblems || [])
		.map((problem) => String(problem.questionFrontendId || "").trim())
		.filter(Boolean))];
	if (!solvedIds.length) {
		return { topics: [], data: [], message: "Import and sync solved problems first." };
	}

	const solvedCatalogProblems = await Problem.find({
		questionFrontendId: { $in: solvedIds },
	})
		.select("topicTags")
		.lean();
	const storedTopics = Object.keys(user.topicStats || {});
	const catalogTopics = solvedCatalogProblems.flatMap((problem) =>
		(problem.topicTags || []).map((tag) => tag.name).filter(Boolean),
	);
	const topics = [...new Set([...storedTopics, ...catalogTopics])];
	if (!topics.length) {
		return { topics: [], data: [], message: "Your solved problems are not in the problem catalog yet." };
	}

	const candidates = await Problem.find({
		questionFrontendId: { $nin: solvedIds },
		"topicTags.name": { $in: topics },
	})
		.select("questionFrontendId title titleSlug difficulty topicTags paidOnly")
		.lean();
	for (let index = candidates.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
	}

	return {
		topics,
		data: candidates.slice(0, 20),
		message: candidates.length ? "" : "No unsolved catalog problems match your topics yet.",
	};
};
