import { Router } from "express";
import { createStudentController } from "../../controllers/Students/studentsController";

const router = Router();

router.post("/", createStudentController);

export default router;
