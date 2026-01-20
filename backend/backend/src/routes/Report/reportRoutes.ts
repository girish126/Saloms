import { Router } from "express";
import {
  getAttendanceHistory,
  getAttendanceMonthly,
  getAttendanceYearly,
  closeTodayAttendance,
} from "../../controllers/Report/Reportcontroller";

const router = Router();

router.get("/attendance", getAttendanceHistory);
router.get("/history", getAttendanceHistory);
router.get("/monthly", getAttendanceMonthly);
router.get("/yearly", getAttendanceYearly);
router.post("/close-day", closeTodayAttendance);

export default router;
