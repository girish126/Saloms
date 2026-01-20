import { Request, Response } from "express";
import {
  queryStudents,
  bulkUpsertStudents,
  exportStudentsToExcel,
} from "../../services/MasterdataService";
import { parseUploadedExcel } from "../../utils/parseFiles";
import path from "path";
import fs from "fs";
import { getPool } from "../../config/db";

// small helper
function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

//  helper to find duplicates in DB
async function findDuplicatesInDB(rfids: string[], adms: string[]) {
  if (!rfids.length && !adms.length) return [];

  const pool = await getPool();
  const result = await pool
    .request()
    .input("rfids", rfids.join(","))
    .input("adms", adms.join(","))
    .query(`
      SELECT TAGID, STUDENT_REGISTRATION_NBR
      FROM dbo.student_master
      WHERE
        (TAGID IS NOT NULL AND TAGID IN (SELECT value FROM STRING_SPLIT(@rfids, ',')))
        OR
        (STUDENT_REGISTRATION_NBR IS NOT NULL 
         AND STUDENT_REGISTRATION_NBR IN (SELECT value FROM STRING_SPLIT(@adms, ',')))
    `);

  return result.recordset || [];
}

export async function getStudents(req: Request, res: Response) {
  try {
    const { className, q, limit, offset } = req.query;

    const rows = await queryStudents({
      className: (className as string) || undefined,
      q: (q as string) || undefined,
      limit: safeNumber(limit, 100),
      offset: safeNumber(offset, 0),
    });

    res.json({ ok: true, students: rows });
  } catch (err: any) {
    console.error("getStudents error:", err);
    res.status(500).json({ ok: false, message: err?.message || "Failed to query students" });
  }
}

//IMPORT with duplicate checks added
export async function importFile(req: Request, res: Response) {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ ok: false, message: "No file uploaded" });
  }

  try {
    const parsed = await parseUploadedExcel(req.file.buffer);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res.status(400).json({ ok: false, message: "No valid student rows found in uploaded file" });
    }

    // ---------- DUPLICATE CHECK IN FILE ----------
    const seenRfids = new Set<string>();
    const seenAdms = new Set<string>();
    const dupRfids = new Set<string>();
    const dupAdms = new Set<string>();

    const rfids: string[] = [];
    const adms: string[] = [];

    for (const r of parsed) {
      const rfid = String(r.tagId ?? "").trim();
      const adm = String(r.studentRegistrationNbr ?? "").trim();

      if (rfid) {
        if (seenRfids.has(rfid)) dupRfids.add(rfid);
        seenRfids.add(rfid);
        rfids.push(rfid);
      }

      if (adm) {
        if (seenAdms.has(adm)) dupAdms.add(adm);
        seenAdms.add(adm);
        adms.push(adm);
      }
    }

    if (dupRfids.size || dupAdms.size) {
      return res.status(400).json({
        ok: false,
        message: "Duplicate RFID or Admission No found in uploaded file",
        duplicateRfids: Array.from(dupRfids),
        duplicateAdmissions: Array.from(dupAdms),
      });
    }

    //DUPLICATE CHECK IN DB 
    const existing = await findDuplicatesInDB(rfids, adms);
    if (existing.length > 0) {
      return res.status(400).json({
        ok: false,
        message: "Duplicate RFID or Admission No already exists in database",
        duplicateRfids: existing.map((r: any) => r.TAGID).filter(Boolean),
        duplicateAdmissions: existing.map((r: any) => r.STUDENT_REGISTRATION_NBR).filter(Boolean),
      });
    }

    //YOUR ORIGINAL LOGIC 
    const result = await bulkUpsertStudents(parsed);

    res.json({ ok: true, message: "Import finished", result });
  } catch (err: any) {
    console.error("importFile error:", err);
    res.status(500).json({ ok: false, message: err?.message || "Failed to import file" });
  }
}


export async function exportExcel(req: Request, res: Response) {
  try {
    const { className, q } = req.query;

    const rows = await queryStudents({
      className: (className as string) || undefined,
      q: (q as string) || undefined,
      limit: 10000,
      offset: 0,
    });

    const result: unknown = await exportStudentsToExcel(rows);

    if (typeof result === "string") {
      const filepath = result;
      if (!fs.existsSync(filepath)) {
        return res.status(500).json({ ok: false, message: "Export failed: file not found" });
      }
      return res.download(filepath, path.basename(filepath), () => {
        try { fs.unlinkSync(filepath); } catch {}
      });
    }

    const buffer = Buffer.isBuffer(result)
      ? result
      : result instanceof ArrayBuffer
      ? Buffer.from(result)
      : Buffer.from((result as any)?.buffer ?? result);

    const filename = `students_export_${Date.now()}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error("exportExcel error:", err);
    res.status(500).json({ ok: false, message: err?.message || "Failed to export Excel" });
  }
}

export default {
  getStudents,
  importFile,
  exportExcel,
};
