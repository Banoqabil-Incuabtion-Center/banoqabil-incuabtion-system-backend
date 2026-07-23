const axios = require("axios");

/**
 * Staff-facing Slack alerts via a single incoming webhook.
 *
 * Deliberately fire-and-forget: Slack being down, rate limiting us, or the
 * webhook being unset must never take down a cron run or fail a request.
 * Every failure is logged and swallowed.
 *
 * Set SLACK_WEBHOOK_URL to enable. Unset (e.g. local dev) = silent no-op.
 */

const LEVEL_EMOJI = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "🚨",
};

const sendSlackAlert = async ({ title, text = "", fields = {}, level = "info" }) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return { sent: false, reason: "SLACK_WEBHOOK_URL not configured" };
  }

  const emoji = LEVEL_EMOJI[level] || LEVEL_EMOJI.info;
  const heading = `${emoji} *${title}*`;

  const fieldLines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `• *${key}:* ${value}`);

  const body = [text, ...fieldLines].filter(Boolean).join("\n");

  try {
    await axios.post(
      webhookUrl,
      {
        // `text` is the notification/fallback string; blocks render in-channel.
        text: `${emoji} ${title}`,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: body ? `${heading}\n${body}` : heading },
          },
        ],
      },
      { timeout: 5000 }
    );

    return { sent: true };
  } catch (error) {
    // 429 from Slack carries Retry-After, but for a once-daily staff digest
    // there is nothing worth retrying — log and move on.
    console.error("⚠️ Slack alert failed:", error.response?.status || error.message);
    return { sent: false, reason: error.message };
  }
};

module.exports = { sendSlackAlert };
