import ExcelJS from "exceljs";

//TYPES
export type ParsedStudent = {
  studentSeqNbr?: number | null;

  schoolCode?: string | null;
  zid?: string | null;

  className?: string | null;
  csaction?: string | null;
  tagId?: string | null;
  fullName?: string | null;

  studentRegistrationNbr: string;
  noOfCommunication?: string | null;
  status?: number | null;

  ipAddress?: string | null;
  createDate?: string | null;
  createdBy?: string | null;

  // parent
  fatherName?: string | null;
  fatherEmail?: string | null;
  address?: string | null;

  rawRowIndex?: number;
};

//HELPERS 

const cellToString = (cell: ExcelJS.Cell | undefined): string => {
  const v = cell?.value;
  if (v === null || v === undefined || v === "") return "";

  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v).trim();
  }

  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof v === "object") {
    const anyV: any = v;

    if (typeof anyV.text === "string") return anyV.text.trim();
    if (Array.isArray(anyV.richText)) {
      return anyV.richText.map((r: any) => r.text || "").join("").trim();
    }

    if (typeof anyV.hyperlink === "string") {
      const match = anyV.hyperlink.match(/^mailto:(.+)/i);
      return match ? match[1].trim() : anyV.hyperlink.trim();
    }
  }

  return String(v).trim();
};

const excelNumberToDateString = (n: number): string | null => {
  try {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + Math.round(n * 86400000));
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    }
  } catch {}
  return null;
};

const cellToDateString = (cell: ExcelJS.Cell | undefined): string | null => {
  const v = cell?.value;
  if (!v) return null;

  if (v instanceof Date) return cellToString(cell);
  if (typeof v === "number") return excelNumberToDateString(v);

  const s = String(v).trim();
  if (!s) return null;

  const normalized = s.replace(/[./]/g, "-");

  const dmy = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  const ymd = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }

  const dt = new Date(normalized);
  if (!Number.isNaN(dt.getTime())) return cellToString({ value: dt } as any);

  return null;
};

const normalizePhone = (s?: string | null): string | null =>
  s ? String(s).replace(/\D+/g, "") || null : null;

const normalizeEmail = (s?: string | null): string | null => {
  if (!s) return null;
  const e = String(s).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
};

//MAIN PARSER

export async function parseUploadedExcel(
  buffer: Buffer | Uint8Array
): Promise<ParsedStudent[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const columnMap: Record<number, string> = {};

  //HEADER NORMALIZATION 
  const mapHeader = (h: string): string | undefined => {
    const cleaned = h
      .trim()
      .toLowerCase()
      .replace(/[\u00a0]/g, " ")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return;

    if (cleaned.includes("admission")) return "studentRegistrationNbr";
    if (cleaned.includes("student") && cleaned.includes("name")) return "fullName";
    if (cleaned === "class" || cleaned === "class name") return "className";
    if (cleaned.includes("section")) return "csaction";
    if (cleaned.includes("date")) return "createDate";

    if (cleaned.includes("email")) return "fatherEmail";

    if (
      cleaned.includes("father") ||
      cleaned.includes("parent") ||
      cleaned.includes("guardian")
    ) {
      return "fatherName";
    }

    if (cleaned.includes("contact") || cleaned.includes("phone") || cleaned.includes("mobile"))
      return "noOfCommunication";

    if (cleaned.includes("address")) return "address";
    if (cleaned.includes("rfid") || cleaned.includes("tag")) return "tagId";
    if (cleaned.includes("status")) return "status";
    if (cleaned.includes("school")) return "schoolCode";
    if (cleaned === "zid") return "zid";

    return;
  };

  headerRow.eachCell((cell, col) => {
    const key = mapHeader(cellToString(cell));
    if (key) columnMap[col] = key;
  });

  const parsed: ParsedStudent[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const raw: Record<string, string> = {};
    Object.entries(columnMap).forEach(([c, k]) => {
      raw[k] = cellToString(row.getCell(Number(c)));
    });

    if (!raw.fatherName) {
      for (let c = 1; c <= headerRow.cellCount; c++) {
        const h = cellToString(headerRow.getCell(c)).toLowerCase();
        if (h.includes("father") || h.includes("parent") || h.includes("guardian")) {
          raw.fatherName = cellToString(row.getCell(c));
          break;
        }
      }
    }

    if (!raw.studentRegistrationNbr) return;

    const student: ParsedStudent = {
      studentSeqNbr: raw.studentSeqNbr ? Number(raw.studentSeqNbr) : undefined,

      schoolCode: raw.schoolCode || "shalom",
      zid: raw.zid || "1",

      className: raw.className || null,
      csaction: raw.csaction || null,
      tagId: raw.tagId || null,
      fullName: raw.fullName || null,

      studentRegistrationNbr: raw.studentRegistrationNbr,
      noOfCommunication: normalizePhone(raw.noOfCommunication),
      status: raw.status ? Number(raw.status) : 1,

      ipAddress: "excel-import",
      createDate: cellToDateString(row.getCell(5)),
      createdBy: "excel-import",

      fatherName: raw.fatherName || null,
      fatherEmail: normalizeEmail(raw.fatherEmail),
      address: raw.address || null,

      rawRowIndex: rowNumber,
    };

    if (student.fatherName && !student.fatherEmail && student.fatherName.includes("@")) {
      student.fatherEmail = normalizeEmail(student.fatherName);
      student.fatherName = null;
    }

    parsed.push(student);
  });

  console.log("parseUploadedExcel FINAL OK – sample:", parsed.slice(0, 5));
  return parsed;
}
