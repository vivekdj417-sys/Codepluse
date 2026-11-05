import { buildDailyPlan } from "../services/dailyPlanService.js";
export const dailyPlan = async (request, response) => {
  const minutes = Number(
    request.body?.availableMinutes || request.query?.availableMinutes,
  );
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 480)
    return response
      .status(400)
      .json({ message: "Available time must be between 15 and 480 minutes." });
  return response.json({ data: await buildDailyPlan(request.user.id, minutes) });
};
