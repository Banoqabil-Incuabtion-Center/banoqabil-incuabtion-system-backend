// Create an admin or reset an admin's password from the server's shell.
// Replaces the old public POST /api/admin/create route, which shipped a hardcoded password.
//
//   cd /var/www/banoqabil-ims/api && NODE_ENV=production node scripts/set-admin-password.js
//
// Reads MONGO_URL the same way app.js does (.env in production, .env.development otherwise).
// Nothing is stored in the repo; the password is typed at the prompt and only its bcrypt hash is saved.
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const root = path.join(__dirname, "..");
const envFile = path.join(root, process.env.NODE_ENV === "production" ? ".env" : ".env.development");
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });

const adminModel = require("../models/admin.model");

const MIN_LENGTH = 12;

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Echo the prompt but mask what is typed
      rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : "*".repeat(s.length));
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  if (!process.env.MONGO_URL) {
    console.error(`MONGO_URL not found (looked in ${envFile}).`);
    process.exit(1);
  }

  const username = (await ask("Admin username [admin]: ")).trim() || "admin";
  const password = await ask(`New password (min ${MIN_LENGTH} characters): `, { hidden: true });
  if (password.length < MIN_LENGTH) {
    console.error(`Password must be at least ${MIN_LENGTH} characters.`);
    process.exit(1);
  }
  const confirm = await ask("Repeat password: ", { hidden: true });
  if (confirm !== password) {
    console.error("Passwords do not match.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);
  const hash = await bcrypt.hash(password, 10);

  // Login reads the first match, so reset every account sharing the username and log out their sessions
  const existing = await adminModel.countDocuments({ username });
  if (existing === 0) {
    await adminModel.create({ username, password: hash });
    console.log(`Admin "${username}" created.`);
  } else {
    await adminModel.updateMany({ username }, { $set: { password: hash }, $unset: { refreshToken: "" } });
    console.log(`Password reset for admin "${username}".`);
    if (existing > 1) {
      console.warn(`Note: ${existing} admin documents share this username; all were reset. Remove the extras from the admins collection.`);
    }
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
