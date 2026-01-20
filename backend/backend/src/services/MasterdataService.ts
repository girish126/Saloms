import sql from "mssql";
import { getPool } from "../config/db";
import ExcelJS from "exceljs";

// DB row shape (partial) 
export interface StudentRow {
  STUDENT_SEQ_NBR?: number;
  SCHOOL_CODE?: string | null;
  ZID?: string | null;
  CLASS_NAME?: string | null;
  CSACTION?: string | null;
  TAGID?: string | null;
  FULL_NAME?: string | null;
  STUDENT_REGISTRATION_NBR?: string | null;
  NO_OF_COMMUNICATION?: string | null;
  STATUS?: number | null;
  IP_ADDRESS?: string | null;
  CREATED_BY?: string | null;
  CREATE_DATE?: string | null;

  fatherName?: string | null;
  fatherEmail?: string | null;
  address?: string | null;
}

export interface StudentFilter {
  q?: string;
  className?: string;
  limit?: number;
  offset?: number;
}

//Query Students
export async function queryStudents(filter: StudentFilter) {
  const pool = await getPool();
  const request = pool.request();

  const offset = typeof filter.offset === "number" && filter.offset >= 0 ? filter.offset : 0;
  const limit = typeof filter.limit === "number" && filter.limit > 0 ? filter.limit : 100;

  request.input("offset", sql.Int, offset);
  request.input("limit", sql.Int, limit);

  const whereClauses: string[] = [];

  if (filter.q) {
    request.input("q", sql.VarChar(500), `%${filter.q}%`);
    whereClauses.push(`
      (
        s.FULL_NAME LIKE @q OR
        s.STUDENT_REGISTRATION_NBR LIKE @q OR
        s.TAGID LIKE @q OR
        s.NO_OF_COMMUNICATION LIKE @q
      )
    `);
  }

  if (filter.className) {
    request.input("className", sql.VarChar(80), filter.className);
    whereClauses.push(`s.CLASS_NAME = @className`);
  }

  const sqlQuery = `
    SELECT
      s.STUDENT_SEQ_NBR,
      s.SCHOOL_CODE,
      s.ZID,
      s.CLASS_NAME,
      s.CSACTION,
      s.TAGID,
      s.FULL_NAME,
      s.STUDENT_REGISTRATION_NBR,
      s.NO_OF_COMMUNICATION,
      s.STATUS,
      s.CREATED_BY,
      s.IP_ADDRESS,
      CONVERT(varchar(30), s.CREATE_DATE, 120) AS CREATE_DATE,
      p.fatherName,
      p.fatherEmail,
      p.address
    FROM dbo.student_master s
    LEFT JOIN dbo.student_parent_details p
      ON p.studentSeqNbr = s.STUDENT_SEQ_NBR
    ${whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : ""}
    ORDER BY s.STUDENT_SEQ_NBR DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY;
  `;

  const result = await request.query(sqlQuery);
  return result.recordset ?? [];
}

//Bulk Upsert Students
export async function bulkUpsertStudents(rows: any[]) {
  const pool = await getPool();

  let inserted = 0;
  let updated = 0;
  const errors: { rowIndex: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const s = rows[i];

    const studentRegistrationNbr =
      (s.studentRegistrationNbr ?? s.admissionNo ?? s["Admission No"] ?? "")
        .toString()
        .trim() || null;

    const tagId = s.tagId ?? s.rfidNo ?? s["RFID No"] ?? null;
    const fullName = s.fullName ?? s.studentName ?? s["Student Name"] ?? null;
    const className = s.className ?? null;
    const csaction = s.csaction ?? s.sectionName ?? null;
    const noOfCommunication = s.noOfCommunication ?? s.fatherPrimaryContact ?? null;
    const status = s.status !== undefined ? Number(s.status) : 1;

    const fatherName = s.fatherName ?? s["Father Name"] ?? null;
    const fatherEmail = s.fatherEmail ?? null;
    const address = s.address ?? null;

    //SAME VALUE AS BEFORE, NOW GOES INTO CREATED_BY
    const createdBy = "excel-import";

    const trx = pool.transaction();

    try {
      await trx.begin();

      let studentSeqNbrResult: number | null = null;
      let actionTaken: "INSERT" | "UPDATE" | null = null;

      if (studentRegistrationNbr) {
        const req = trx.request();
        req.input("regNbr", sql.VarChar(220), studentRegistrationNbr);
        req.input("className", sql.VarChar(80), className);
        req.input("csaction", sql.VarChar(60), csaction);
        req.input("fullName", sql.VarChar(220), fullName);
        req.input("noComm", sql.VarChar(50), noOfCommunication);
        req.input("tagId", sql.VarChar(120), tagId);
        req.input("status", sql.SmallInt, status);
        req.input("createdBy", sql.VarChar(120), createdBy);

        const mergeSql = `
          MERGE dbo.student_master AS target
          USING (SELECT @regNbr AS STUDENT_REGISTRATION_NBR) AS src
          ON target.STUDENT_REGISTRATION_NBR = src.STUDENT_REGISTRATION_NBR
          WHEN MATCHED THEN
            UPDATE SET
              CLASS_NAME = @className,
              CSACTION = @csaction,
              FULL_NAME = @fullName,
              NO_OF_COMMUNICATION = @noComm,
              TAGID = @tagId,
              STATUS = @status,
              CREATED_BY = @createdBy,
              IP_ADDRESS = NULL
          WHEN NOT MATCHED THEN
            INSERT (
              CLASS_NAME, CSACTION, FULL_NAME, NO_OF_COMMUNICATION,
              TAGID, STATUS, CREATED_BY, IP_ADDRESS, CREATE_DATE, STUDENT_REGISTRATION_NBR
            )
            VALUES (
              @className, @csaction, @fullName, @noComm,
              @tagId, @status, @createdBy, NULL, SYSDATETIME(), @regNbr
            )
          OUTPUT inserted.STUDENT_SEQ_NBR AS studentSeqNbr, $action AS action;
        `;

        const res = await req.query(mergeSql);
        studentSeqNbrResult = res.recordset?.[0]?.studentSeqNbr ?? null;
        actionTaken = res.recordset?.[0]?.action ?? null;
      }

      if (studentSeqNbrResult) {
        const pReq = trx.request();
        pReq.input("studentSeqNbr", sql.Int, studentSeqNbrResult);
        pReq.input("fatherName", sql.VarChar(250), fatherName);
        pReq.input("fatherEmail", sql.VarChar(250), fatherEmail);
        pReq.input("address", sql.VarChar(1000), address);

        await pReq.query(`
          MERGE dbo.student_parent_details AS tgt
          USING (SELECT @studentSeqNbr AS studentSeqNbr) AS src
          ON tgt.studentSeqNbr = src.studentSeqNbr
          WHEN MATCHED THEN
            UPDATE SET
              fatherName = @fatherName,
              fatherEmail = @fatherEmail,
              address = @address,
              updatedAt = SYSDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (studentSeqNbr, fatherName, fatherEmail, address, createdAt, updatedAt)
            VALUES (@studentSeqNbr, @fatherName, @fatherEmail, @address, SYSDATETIME(), SYSDATETIME());
        `);
      }

      await trx.commit();

      if (actionTaken === "INSERT") inserted++;
      if (actionTaken === "UPDATE") updated++;

    } catch (err: any) {
      try { await trx.rollback(); } catch {}
      errors.push({ rowIndex: i + 1, message: err?.message ?? String(err) });
    }
  }

  return { inserted, updated, errors };
}

//Export Students
export async function exportStudentsToExcel(rows: StudentRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Students");

  sheet.addRow([
    "Admission No",
    "StudentSeqNo",
    "Class",
    "Section",
    "Student Name",
    "Contact No",
    "RFID No",
    "Status",
    "Created",
    "Created By",
    "Father Name",
    "Father Email",
    "Address",
  ]);

  for (const r of rows) {
    sheet.addRow([
      r.STUDENT_REGISTRATION_NBR ?? "",
      r.STUDENT_SEQ_NBR ?? "",
      r.CLASS_NAME ?? "",
      r.CSACTION ?? "",
      r.FULL_NAME ?? "",
      r.NO_OF_COMMUNICATION ?? "",
      r.TAGID ?? "",
      r.STATUS ?? "",
      r.CREATE_DATE ?? "",
      r.CREATED_BY ?? "",
      r.fatherName ?? "",
      r.fatherEmail ?? "",
      r.address ?? "",
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
