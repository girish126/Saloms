import multer from "multer";
import path from "path";

function excelFileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const allowed = [".xls", ".xlsx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error("Only Excel files are allowed (.xls, .xlsx)"));
  }
  cb(null, true);
}
const storage = multer.memoryStorage();

export const upload = multer({ storage, fileFilter: excelFileFilter });
export default upload;
