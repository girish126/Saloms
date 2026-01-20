import express from "express";
import { getStudents, importFile, exportExcel } from "../../controllers/Masterdata/masterdataController";
import { upload } from "../../middleware/upload";

const masterdata = express.Router();

masterdata.get("/students", getStudents);
masterdata.post("/import", upload.single("file"), importFile);
masterdata.get("/export/excel", exportExcel);

export default masterdata;
