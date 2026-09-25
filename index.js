"use strict";

const { addLog } = require("./logger");
const mineflayer = require("mineflayer");
const config = require("./settings.json");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;

let botState = {
  connected: false,
  startTime: Date.now(),
  reconnectAttempts: 0,
};

app.get("/", (req, res) => res.send("MoonPai AFK Bot is Online 24/7!"));
app.get("/ping", (req, res) => res.send("pong"));
app.get("/health", (req, res) => {
  res.json({
    status: botState.connected ? "connected" : "disconnected",
    uptime: Math.floor((Date.now() - botState.startTime) / 1000),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  addLog(`[Server] Web server started on port ${PORT}`);
});

let bot = null;

function createBot() {
  addLog(`[Bot] Connecting to ${config.server.ip}:${config.server.port}...`);

  try {
    bot = mineflayer.createBot({
      username: config["bot-account"].username,
      password: config["bot-account"].password || undefined,
      auth: config["bot-account"].type,
      host: config.server.ip,
      port: config.server.port,
      version: false,
    });

    bot.once("spawn", () => {
      botState.connected = true;
      botState.reconnectAttempts = 0;
      addLog("[Bot] Server me successfully spawn ho gyo!");

      setInterval(() => {
        if (bot && botState.connected) {
          try { bot.swingArm(); } catch (e) {}
        }
      }, 25000);
    });
    // ---------- AUTO VERIFY CODE (ANTI-SHUTDOWN CAPTCHA) ----------
    bot.on("messagestr", (message) => {
      addLog(`[Chat] ${message}`);

      const match = message.match(/Enter code\s+([a-zA-Z0-9]+)\s+in chat/i);
      if (match) {
        const verifyCode = match[1];
        addLog(`[Verify] Code pakad lyo: ${verifyCode}`);

        setTimeout(() => {
          if (bot && botState.connected) {
            bot.chat(verifyCode);
            addLog(`[Verify] Code chat me bhej dyo: ${verifyCode}`);
          }
        }, 2500);
      }
    });

    bot.on("kicked", (reason) => {
      addLog(`[Bot] Kicked: ${reason}`);
      botState.connected = false;
    });

    bot.on("end", () => {
      addLog("[Bot] Disconnected! 10s me reconnect hoyega...");
      botState.connected = false;
      setTimeout(createBot, 10000);
    });

    bot.on("error", (err) => {
      addLog(`[Bot] Error: ${err.message}`);
    });

  } catch (err) {
    addLog(`[Bot] Failed to create: ${err.message}`);
    setTimeout(createBot, 10000);
  }
}

createBot();
