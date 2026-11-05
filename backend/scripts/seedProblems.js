import "dotenv/config";
import axios from "axios";
import { connectDatabase } from "../src/db/mongoose.js";
import { Problem } from "../src/models/Problem.js";

const endpoint = "https://leetcode.com/graphql";
const query = `
  query ProblemsetQuestionList($limit: Int!, $skip: Int!) {
    problemsetQuestionListV2(limit: $limit, skip: $skip, filters: { filterCombineType: ALL }) {
      questions {
        questionFrontendId
        title
        titleSlug
        difficulty
        paidOnly
        topicTags { name slug }
      }
    }
  }
`;

const fetchProblems = async () => {
  const questions = [];
  const limit = 100;
  for (let skip = 0; ; skip += limit) {
    let response;
    try {
      response = await axios.post(endpoint, {
        query,
        variables: { limit, skip },
      }, { timeout: 30_000, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      const details = error.response?.data?.errors?.map((item) => item.message).join("; ");
      throw new Error(details || error.message);
    }
    if (response.data?.errors?.length) {
      throw new Error(response.data.errors.map((error) => error.message).join("; "));
    }
    const result = response.data?.data?.problemsetQuestionListV2;
    const batch = result?.questions || [];
    if (!batch.length && !questions.length) throw new Error("LeetCode returned no public problems.");
    questions.push(...batch);
    console.log(`Fetched ${questions.length} public problems...`);
    if (batch.length < limit) break;
  }
  return questions;
};

const run = async () => {
  await connectDatabase();
  const questions = await fetchProblems();
  const operations = questions.map((question) => ({
    updateOne: {
      filter: { questionFrontendId: String(question.questionFrontendId) },
      update: {
        $set: {
          questionFrontendId: String(question.questionFrontendId),
          title: question.title,
          titleSlug: question.titleSlug,
          difficulty: question.difficulty,
          topicTags: (question.topicTags || []).map((tag) => ({ name: tag.name, slug: tag.slug || "" })),
          paidOnly: Boolean(question.paidOnly),
        },
      },
      upsert: true,
    },
  }));
  const result = await Problem.bulkWrite(operations, { ordered: false });
  console.log(`Seeded ${questions.length} problems (${result.upsertedCount} inserted, ${result.modifiedCount} updated).`);
};

run().catch((error) => {
  console.error(`Problem seeding failed: ${error.message}`);
  process.exitCode = 1;
}).finally(async () => {
  await import("mongoose").then(({ default: mongoose }) => mongoose.disconnect());
});