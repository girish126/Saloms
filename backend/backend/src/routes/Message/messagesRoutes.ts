import { Router } from "express";
import { getMessagesController } from "../../controllers/Message/messagescontroller";

const router = Router();

router.get("/", getMessagesController);

export default router;
