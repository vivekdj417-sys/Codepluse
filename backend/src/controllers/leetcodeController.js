import { fetchLeetCodeData } from "../services/leetcodeService.js";

export const getLeetCodeProfile = async (request, response) => {
  const username = request.params.username?.trim();
  if (!username) return response.status(400).json({ message: "Username is required" });

  try {
    const data = await fetchLeetCodeData(username);
    return response.json({ ...data, source: "leetcode", stale: false });
  } catch (error) {
    const status = /not found/i.test(error.message) ? 404 : 502;
    return response.status(status).json({ message: "Unable to fetch LeetCode data.", error: error.message });
  }
};