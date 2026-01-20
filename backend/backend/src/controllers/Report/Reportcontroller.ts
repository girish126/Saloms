import type { Request, Response } from "express";
import { getPool } from "../../config/db";

// ================= SHARED LOGIC =================

const getAttendanceByDate = async (reportDate: string) => {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("reportDate", reportDate)
    .query(`
      DECLARE @isAfterCutoff BIT;

      IF CAST(@reportDate AS DATE) < CAST(GETDATE() AS DATE)
        SET @isAfterCutoff = 1;
      ELSE
        SET @isAfterCutoff =
          CASE
            WHEN CAST(GETDATE() AS TIME) >= '11:00:00' THEN 1
            ELSE 0
          END;

      SELECT
        s.STUDENT_SEQ_NBR AS id,
        LTRIM(RTRIM(s.TAGID)) AS tagId,
        s.FULL_NAME AS name,
        FORMAT(MIN(t.date), 'hh:mm tt') AS inTime,
        CASE
          WHEN COUNT(t.date) > 1
           AND DATEDIFF(MINUTE, MIN(t.date), MAX(t.date)) >= 30
            THEN FORMAT(MAX(t.date), 'hh:mm tt')
          ELSE NULL
        END AS outTime,
        COUNT(t.date) AS scanCount,
        @isAfterCutoff AS isAfterCutoff
      FROM dbo.student_master s
      LEFT JOIN dbo.tbltagLogs t
        ON LTRIM(RTRIM(t.tag_id)) = LTRIM(RTRIM(s.TAGID))
        AND CAST(t.date AS DATE) = @reportDate
      GROUP BY
        s.STUDENT_SEQ_NBR,
        s.FULL_NAME,
        s.TAGID
      ORDER BY
        CASE WHEN COUNT(t.date) > 0 THEN 0 ELSE 1 END,
        MIN(t.date);
    `);

  const rows = result.recordset.map((r: any) => {
    let status: "Present" | "Pending" | "Absent";

    if (r.scanCount > 0) status = "Present";
    else status = r.isAfterCutoff ? "Absent" : "Pending";

    return {
      id: r.id,
      tagId: r.tagId,
      name: r.name,
      inTime: r.inTime ?? null,
      outTime: r.outTime ?? null,
      date: reportDate, // ✅ attach date
      message:
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

  return rows;
};

// ================= CONTROLLER =================

export const getAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const { date, from, to } = req.query as {
      date?: string;
      from?: string;
      to?: string;
    };

    let allRows: any[] = [];

    // ✅ RANGE MODE
    if (from && to) {
      let d = new Date(from);
      const end = new Date(to);

      while (d <= end) {
        const day = d.toISOString().slice(0, 10);
        const rows = await getAttendanceByDate(day);
        allRows.push(...rows);
        d.setDate(d.getDate() + 1);
      }
    }
    // ✅ SINGLE DATE MODE
    else {
      const reportDate =
        typeof date === "string"
          ? date
          : new Date().toISOString().slice(0, 10);

      allRows = await getAttendanceByDate(reportDate);
    }

    res.json({
      ok: true,
      rows: allRows,
      stats: {
        total: allRows.length,
        present: allRows.filter(r => r.status === "Present").length,
        pending: allRows.filter(r => r.status === "Pending").length,
        absent: allRows.filter(r => r.status === "Absent").length,
      },
    });
  } catch (err) {
    console.error("History report error:", err);
    res.status(500).json({ ok: false, message: "History report failed" });
  }
};

// ================= STUBS =================

export const getAttendanceMonthly = async (_req: Request, res: Response) => {
  res.json({ ok: true, message: "Monthly report not implemented yet", rows: [] });
};

export const getAttendanceYearly = async (_req: Request, res: Response) => {
  res.json({ ok: true, message: "Yearly report not implemented yet", rows: [] });
};

export const closeTodayAttendance = async (_req: Request, res: Response) => {
  res.json({ ok: true, message: "Day closed successfully (logical close)" });
};
