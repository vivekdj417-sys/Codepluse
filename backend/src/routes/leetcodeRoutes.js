import { Router } from "express";
import { getLeetCodeProfile } from "../controllers/leetcodeController.js";
import {
  getSolvedProblemNumbers,
  importUsernameQuickSync,
  listProblemCatalog,
  syncRecentSolvedProblems,
  syncFullSolvedProblems,
  syncSolvedProblems,
} from "../controllers/leetcodeProblemsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.post("/import-username", requireAuth, importUsernameQuickSync);
router.post("/sync-full", requireAuth, syncFullSolvedProblems);
router.get("/sync-recent", requireAuth, syncRecentSolvedProblems);
router.post("/sync-solved", requireAuth, syncSolvedProblems);
router.get("/catalog", requireAuth, listProblemCatalog);
router.get("/:username/solved-numbers", getSolvedProblemNumbers);
router.get("/:username", getLeetCodeProfile);
export default router;