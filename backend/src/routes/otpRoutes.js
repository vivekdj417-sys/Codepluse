import { Router } from "express";
import { confirmOtp, requestOtp } from "../controllers/otpController.js";

const router = Router();

router.post("/request", requestOtp);
router.post("/verify", confirmOtp);

export default router;
