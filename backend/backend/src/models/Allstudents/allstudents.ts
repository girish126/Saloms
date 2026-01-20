import * as StudentModelModule from "../students/Studentmodel";
import StudentModelDefault from "../students/Studentmodel";

const StudentModel: any = {
  ...StudentModelModule,
  ...(typeof StudentModelDefault === "object" ? StudentModelDefault : {}),
};

const ensureMethod = (methodName: string) => {
  const fn = StudentModel[methodName];
  if (typeof fn !== "function") {
    throw new Error(`${methodName} not implemented in Studentmodel`);
  }
  return fn;
};

export const getAllStudents = async (limit?: number) => {
  return ensureMethod("getAllStudents")(limit);
};

export const getStudentById = async (id: number) => {
  return ensureMethod("getStudentById")(id);
};

export const updateStudent = async (id: number, payload: any) => {
  return ensureMethod("updateStudent")(id, payload);
};


export const importStudents = async (rows: any[]) => {
  return ensureMethod("importStudents")(rows);
};

export const fetchStudentsForExport = async (limit?: number) => {
  return ensureMethod("fetchStudentsForExport")(limit);
};


export const findByTagId = async (tagId: string) => {
  return ensureMethod("findByTagId")(tagId);
};

export const findByAdmissionNo = async (admissionNo: string) => {
  return ensureMethod("findByAdmissionNo")(admissionNo);
};

export const deleteStudent = async (id: number) => {
  return ensureMethod("deleteStudent")(id);
};


export default {
  getAllStudents,
  getStudentById,
  updateStudent,
  importStudents,
  fetchStudentsForExport,
  deleteStudent,  
  findByTagId,
  findByAdmissionNo,
};
