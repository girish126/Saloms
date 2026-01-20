import { Request, Response } from "express";
import { getMessagesFromDB } from "../../models/Mesages/messagesModel";

export const getMessagesController = async (
  req: Request,
  res: Response
) => {
  try {
    const { search, status, failureType } = req.query;

    const rows = await getMessagesFromDB({
      search: typeof search === "string" ? search : undefined,
      status:
        typeof status === "string" && status !== ""
          ? Number(status)
          : undefined,
      failureType:
        typeof failureType === "string" ? failureType : undefined,
    });

    res.json({ ok: true, rows });
  } catch (err) {
    console.error("Messages API error:", err);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch messages",
    });
  }
};
