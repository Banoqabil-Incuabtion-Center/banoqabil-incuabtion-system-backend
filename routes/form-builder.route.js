const express = require("express");
const router = express.Router();
const formBuilderController = require("../controllers/form-builder.controller");
const { optionalProtect, protect } = require("../middlewares/auth.middleware");

// ==========================================
// PUBLIC ROUTES (Registration & Form Schema)
// ==========================================
// Anyone can fetch the public form schema
router.get("/public", formBuilderController.getForm);
// Anyone can submit the internship registration form
router.post("/submit", formBuilderController.submitApplication);

// ==========================================
// ADMIN / MANAGEMENT ROUTES
// ==========================================
// Get current form schema
router.get("/", optionalProtect, formBuilderController.getForm);
// Update entire form schema
router.put("/", optionalProtect, formBuilderController.updateForm);
// Reset to default 3 sections and fields
router.post("/reset", optionalProtect, formBuilderController.resetForm);

// Section routes
router.post("/sections", optionalProtect, formBuilderController.addSection);
router.put("/sections/:sectionId", optionalProtect, formBuilderController.updateSection);
router.delete("/sections/:sectionId", optionalProtect, formBuilderController.deleteSection);

// Field routes
router.post("/sections/:sectionId/fields", optionalProtect, formBuilderController.addField);
router.put("/sections/:sectionId/fields/:fieldId", optionalProtect, formBuilderController.updateField);
router.delete("/sections/:sectionId/fields/:fieldId", optionalProtect, formBuilderController.deleteField);
router.put("/sections/:sectionId/reorder", optionalProtect, formBuilderController.reorderFields);

// Submissions list
router.get("/submissions", optionalProtect, formBuilderController.getSubmissions);

module.exports = router;
