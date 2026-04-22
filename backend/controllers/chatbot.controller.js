import jwt from "jsonwebtoken";
import { processChatbotMessage } from "../services/chatbot.service.js";

function getTokenFromRequest(req) {
  const authHeader = String(req.headers.authorization || "");

  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function decodeOptionalUser(req) {
  try {
    const token = getTokenFromRequest(req);

    if (!token || !process.env.JWT_SECRET) {
      return null;
    }

    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function handleChatbotMessage(req, res) {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar un mensaje."
      });
    }

    const optionalUser = decodeOptionalUser(req);
    const response = await processChatbotMessage({
      message,
      userID: optionalUser?.userID || null
    });

    return res.json(response);
  } catch (error) {
    console.error("[CHATBOT] Error handleChatbotMessage", {
      name: error?.name || "Error",
      message: error?.message || "Sin mensaje",
      code: error?.code || null,
      errno: error?.errno || null,
      sqlState: error?.sqlState || null,
      sqlMessage: error?.sqlMessage || null
    });

    return res.status(500).json({
      ok: false,
      message: "No pude procesar tu mensaje en este momento."
    });
  }
}
