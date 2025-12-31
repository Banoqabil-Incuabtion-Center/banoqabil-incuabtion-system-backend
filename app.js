const express = require("express"); // Restart trigger
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const dotenv = require("dotenv");
const http = require("http");

// 🧠 Load environment variables only in local development
if (process.env.NODE_ENV !== "production") {
  const envFile = ".env.development";
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`✅ Loaded environment from ${envFile}`);
  } else {
    console.warn("⚠️ .env.development not found");
  }
} else {
  console.log("🚀 Running in production mode (Vercel environment vars)");
}

const indexRoute = require("./routes/index.route");
const commentRoute = require("./routes/comment.route");
const likeRoute = require("./routes/like.route");
const { initializeSocket } = require("./socket");
const notificationRoute = require("./routes/notification.routes");
require("./config/db.config")();
const { initAttendanceJobs } = require("./jobs/attendance.job");
initAttendanceJobs(); // Start the cron job

// Brain of the app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);
console.log("✅ Socket.IO initialized");

// 1. CORS - Robust configuration for production and local development
const allowedOrigins = [
  process.env.ADMIN_URL,
  process.env.USER_URL,
  process.env.LOCAL_URL,
  "https://banoqabil-incubatees.vercel.app",
  "https://ims-frontend-admin.vercel.app"
].filter(Boolean).map(url => url.trim().replace(/\/$/, ""));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, "")) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      console.warn("🚫 CORS Blocked origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Explicitly handle preflight requests
app.options("*", cors());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date(),
    env: process.env.NODE_ENV,
    smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
  });
});

app.use(express.json());
app.use(cookieParser());
app.use("/images", express.static(path.join(__dirname, "public/images")));
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

// Routes
app.get("/", (req, res) => res.render("dashboard"));
app.use("/", indexRoute);
app.use("/api/comments", commentRoute);
app.use("/api/likes", likeRoute);
app.use("/api/notifications", notificationRoute);
const pushRoute = require("./routes/push.route");
app.use("/api/push", pushRoute);

// Global Error Handler (MUST be last)
const errorMiddleware = require("./middlewares/error.middleware");
app.use(errorMiddleware);

// Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
