import express from "express";
import { handleChatbotMessage } from "../controllers/chatbot.controller.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Chatbot listo."
  });
});

router.post("/message", handleChatbotMessage);

export default router;
