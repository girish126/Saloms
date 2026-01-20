import { Router } from "express";
import { getTodayAttendance } from "../../controllers/Dashboard/Dashboardcontroller";

const router = Router();

router.get("/today", getTodayAttendance);

export default router;
