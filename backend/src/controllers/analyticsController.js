import { getOverview } from "../services/analyticsService.js";
export const overview = async (request, response) =>
  response.json({ data: await getOverview(request.user.id) });
