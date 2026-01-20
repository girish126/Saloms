import sql from "mssql";
import { getPool } from "../../config/db";

export const getMessagesFromDB = async (filters: {
  search?: string;
  status?: number;
  failureType?: string;
}) => {
  const pool = await getPool();

  let where = "WHERE 1=1";

  if (filters.search) {
    where += `
      AND (
        RESIDENCE_ID LIKE @search
        OR MOBILE_NO LIKE @search
        OR SMS_TEXT LIKE @search
      )
    `;
  }

  if (filters.status !== undefined) {
    where += " AND STATUS = @status";
  }

  if (filters.failureType === "user_not_found") {
    where += " AND MOBILE_NO IS NULL AND API_RESPONSE = 'USER NOT FOUND'";
  }

  const request = pool.request();

  if (filters.search) {
    request.input("search", sql.VarChar, `%${filters.search}%`);
  }

  if (filters.status !== undefined) {
    request.input("status", sql.SmallInt, filters.status);
  }

  const result = await request.query(`
    SELECT
      SMS_SEQ_NBR  AS smsSeqNbr,
      RESIDENCE_ID AS residenceId,
      MOBILE_NO    AS mobileNo,
      SMS_TEXT     AS smsText,
      API_RESPONSE AS apiResponse,
      STATUS       AS status,
      FORMAT(CREATE_DATE, 'yyyy-MM-dd HH:mm:ss') AS createDate
    FROM dbo.tlb_sms_log_master
    ${where}
    ORDER BY CREATE_DATE DESC
  `);

  return result.recordset;
};
