import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("codepulse_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const register = (payload) => api.post("/auth/register", payload);
export const login = (payload) => api.post("/auth/login", payload);
export const requestOtp = (payload) => api.post("/otp/request", payload);
export const verifyOtp = (payload) => api.post("/otp/verify", payload);
export const importProfile = (username) =>
  api.post("/user/import", { username });
export const importLeetCodeUsername = (username) =>
  api.post("/leetcode/import-username", { username });
export const syncFullLeetCode = (solvedProblems) =>
  api.post("/leetcode/sync-full", { solvedProblems });
export const syncRecentLeetCode = () => api.get("/leetcode/sync-recent");
export const getCurrentUser = () => api.get("/user/profile");
export const getOverview = () => api.get("/analytics/overview");
export const getRecommendations = () => api.get("/recommendations");
export const getDailyPlan = (availableMinutes = 60) =>
  api.get(`/daily-plan?availableMinutes=${availableMinutes}`);
export const getLeetCodeProfile = (username) => api.get(`/leetcode/${encodeURIComponent(username)}`);
export const syncSolvedProblems = (solvedQuestionIds) =>
  api.post("/leetcode/sync-solved", { solvedQuestionIds });
export const getProblemCatalog = () => api.get("/leetcode/catalog");
