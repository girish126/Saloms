
import { Router } from "express";
import {
  listAllStudents,
  getStudent,
  updateStudentController,

} from "../../controllers/Allstudents/allstudents";
import { deleteStudentController } from "../../controllers/Allstudents/allstudents";

const router = Router();
router.delete("/:id", deleteStudentController);
router.get("/", listAllStudents);
router.get("/:id", getStudent);
router.put("/:id", updateStudentController);
export default router;
