import type { Request, Response } from "express";
import { getPool } from "../../config/db";

//TYPES
export type DashboardRow = {
  id: number;
  admissionCode: string | null;
  name: string | null;
  inTime: string | null;
  outTime: string | null;
  messageError: string | null;
  status: "Present" | "Pending" | "Absent";
};

//CONTROLLER
export const getTodayAttendance = async (_req: Request, res: Response) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      /* ================= 11 AM CUTOFF ================= */
      DECLARE @isAfterCutoff BIT =
        CASE
          WHEN CAST(GETDATE() AS TIME) >= '11:00:00' THEN 1
          ELSE 0
        END;

      SELECT
        s.STUDENT_SEQ_NBR AS id,
        s.FULL_NAME AS name,
        LTRIM(RTRIM(s.TAGID)) AS TAGID,

        /* ---------- FIRST SCAN (IN TIME) ---------- */
        FORMAT(MIN(t.date), 'hh:mm tt') AS inTime,

        /* ======================================================
    🔴 CHANGE IS HERE (30 MIN COOLDOWN LOGIC)
           OUT TIME is shown ONLY if:
           - there are at least 2 scans
           - AND difference between first & last scan >= 30 min
        ====================================================== */
        CASE
          WHEN COUNT(t.date) > 1
           AND DATEDIFF(
                 MINUTE,
                 MIN(t.date),
                 MAX(t.date)
               ) >= 30
            THEN FORMAT(MAX(t.date), 'hh:mm tt')
          ELSE NULL
        END AS outTime,

        COUNT(t.date) AS scanCount,
        @isAfterCutoff AS isAfterCutoff
      FROM dbo.student_master s
      LEFT JOIN dbo.tbltagLogs t
        ON LTRIM(RTRIM(t.tag_id)) = LTRIM(RTRIM(s.TAGID))
        AND CAST(t.date AS date) = CAST(GETDATE() AS date)
      GROUP BY
        s.STUDENT_SEQ_NBR,
        s.FULL_NAME,
        s.TAGID
      ORDER BY
        CASE WHEN COUNT(t.date) > 0 THEN 0 ELSE 1 END, -- scanned first
        MIN(t.date);                                  -- earliest scan first
    `);

    const rows: DashboardRow[] = result.recordset.map((r: any) => {
      let status: "Present" | "Pending" | "Absent";

      if (r.scanCount > 0) {
        status = "Present";
      } else {
        status = r.isAfterCutoff ? "Absent" : "Pending";
      }

      return {
        id: r.id,
        admissionCode: r.TAGID,
        name: r.name,
        inTime: r.inTime ?? null,
        outTime: r.outTime ?? null,
        messageError:
          status === "Present"
            ? r.outTime
              ? "Student exited"
              : "Student inside (cooldown active)"
            : status === "Pending"
            ? "Awaiting scan"
            : "No scan today",
        status,
      };
    });

    res.json({
      ok: true,
      rows,
      stats: {
        total: rows.length,
        present: rows.filter(r => r.status === "Present").length,
        pending: rows.filter(r => r.status === "Pending").length,
        absent: rows.filter(r => r.status === "Absent").length,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({
      ok: false,
      message: "Dashboard failed",
    });
  }
};
