import { getRecommendations } from "../services/recommendationService.js";
export const listRecommendations = async (request, response) =>
  response.json(await getRecommendations(request.user.id));
