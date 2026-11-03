const { z } = require("zod");

// Mirrors the client-side rules in the banoqabil.online landing form (landing-page-form/script.js)

const STATUSES = ["New", "Shortlisted", "Rejected"];

const digitsOf = (v) => String(v ?? "").replace(/\D/g, "");

const requiredText = (label, { min = 1, max = 200 } = {}) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(min, min > 1 ? `${label} must be at least ${min} characters.` : `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`);

// Accepts "300 1234567", "03001234567" or "+92 300 1234567"; stores "3001234567"
const pkMobile = (label) =>
  z.string({ error: `${label} is required.` }).transform((value, ctx) => {
    let d = digitsOf(value);
    if (d.startsWith("92") && d.length === 12) d = d.slice(2);
    else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
    if (d.length !== 10 || d[0] !== "3" || /^(\d)\1{9}$/.test(d)) {
      ctx.addIssue({ code: "custom", message: `${label} must be a valid mobile number (e.g. 300 1234567).` });
      return z.NEVER;
    }
    return d;
  });

// Stores the dashed form 42101-1234567-1 so the duplicate check matches however it was typed
const cnic = z.string({ error: "CNIC number is required." }).transform((value, ctx) => {
  const d = digitsOf(value);
  if (d.length !== 13 || d[0] !== "4" || /^(\d)\1{12}$/.test(d)) {
    ctx.addIssue({ code: "custom", message: "CNIC must be 13 digits starting with 4 (e.g. 42101-1234567-1)." });
    return z.NEVER;
  }
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
});

const dateOfBirth = z
  .string({ error: "Date of birth is required." })
  .trim()
  .refine((v) => {
    const d = new Date(v);
    return !Number.isNaN(d.getTime()) && d < new Date() && d.getFullYear() >= 1925;
  }, "Please enter a valid date of birth.");

const obtainedMarks = z
  .union([z.string(), z.number()], { error: "Obtained marks are required." })
  .transform((v) => String(v).trim())
  .refine((v) => v !== "" && !Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Please enter valid obtained marks.");

const RegistrationSchema = z.object({
  fullName: requiredText("Full name", { min: 2, max: 100 }),
  dateOfBirth,
  gender: z.enum(["Male", "Female"], { error: "Please select a gender." }),
  address: requiredText("Address", { min: 5, max: 300 }),
  emailAddress: z
    .string({ error: "Email address is required." })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  phoneNumber: pkMobile("Phone number"),
  // Optional: the form sends "" when left blank
  guardianNumber: z.preprocess((v) => (v === "" || v === null ? undefined : v), pkMobile("Guardian number").optional()),
  cnicNumber: cnic,
  fatherOrGuardianName: requiredText("Father/Guardian name", { min: 2, max: 100 }),
  course: requiredText("Course"),
  teacherName: requiredText("Teacher name", { max: 100 }),
  campus: requiredText("Campus"),
  obtainedMarks,
  aboutYou: requiredText("About yourself", { min: 10, max: 2000 }),
  // Fields added later through the admin Form Builder
  dynamicData: z.record(z.string(), z.unknown()).optional().default({}),
});

const RegistrationStatusSchema = z.object({
  status: z.enum(STATUSES, { error: `Status must be one of: ${STATUSES.join(", ")}.` }),
});

module.exports = { RegistrationSchema, RegistrationStatusSchema, STATUSES };
