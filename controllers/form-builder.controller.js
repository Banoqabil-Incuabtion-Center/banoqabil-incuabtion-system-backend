const { FormModel, defaultFormSections } = require("../models/form-builder.model");
const InternshipApplication = require("../models/internship-application.model");

// Utility to generate a safe alphanumeric ID from a string
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "_");
}

const formBuilderController = {};

// ✅ GET /api/form-builder (or public)
formBuilderController.getForm = async (req, res, next) => {
  try {
    const form = await FormModel.getForm("internship_registration");
    return res.status(200).json({
      success: true,
      form,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ PUT /api/form-builder (Full form update)
formBuilderController.updateForm = async (req, res, next) => {
  try {
    const { title, subtitle, sections } = req.body;
    const form = await FormModel.getForm("internship_registration");

    if (title !== undefined) form.title = title;
    if (subtitle !== undefined) form.subtitle = subtitle;
    if (sections && Array.isArray(sections)) {
      form.sections = sections;
    }

    await form.save();
    return res.status(200).json({
      success: true,
      message: "Form updated successfully",
      form,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ POST /api/form-builder/sections (Add new section)
formBuilderController.addSection = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Section title is required" });
    }

    const form = await FormModel.getForm("internship_registration");
    let baseId = slugify(title);
    if (!baseId) baseId = `section_${Date.now()}`;

    // Ensure unique ID
    let sectionId = baseId;
    let counter = 1;
    while (form.sections.some((s) => s.id === sectionId)) {
      sectionId = `${baseId}_${counter++}`;
    }

    const newSection = {
      id: sectionId,
      title: title.trim(),
      description: description ? description.trim() : "",
      order: form.sections.length,
      fields: [],
    };

    form.sections.push(newSection);
    await form.save();

    return res.status(201).json({
      success: true,
      message: "Section created successfully",
      form,
      section: newSection,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ PUT /api/form-builder/sections/:sectionId (Edit section)
formBuilderController.updateSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Section title is required" });
    }

    const form = await FormModel.getForm("internship_registration");
    const section = form.sections.find((s) => s.id === sectionId);

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    section.title = title.trim();
    if (description !== undefined) {
      section.description = description.trim();
    }

    await form.save();

    return res.status(200).json({
      success: true,
      message: "Section updated successfully",
      form,
      section,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ DELETE /api/form-builder/sections/:sectionId (Delete section)
formBuilderController.deleteSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const form = await FormModel.getForm("internship_registration");

    const sectionIndex = form.sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) {
      return res.status(404).json({ message: "Section not found" });
    }

    form.sections.splice(sectionIndex, 1);
    // Reorder remaining sections
    form.sections.forEach((sec, idx) => {
      sec.order = idx;
    });

    await form.save();

    return res.status(200).json({
      success: true,
      message: "Section deleted successfully",
      form,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ POST /api/form-builder/sections/:sectionId/fields (Add field to section)
formBuilderController.addField = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { label, type, placeholder, required, options } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({ message: "Field label is required" });
    }

    const allowedTypes = [
      "text",
      "number",
      "email",
      "password",
      "date",
      "phone",
      "textarea",
      "checkbox",
      "radio",
      "select",
      "file",
    ];

    if (!type || !allowedTypes.includes(type.toLowerCase())) {
      return res.status(400).json({
        message: `Field type must be one of: ${allowedTypes.join(", ")}`,
      });
    }

    const normalizedType = type.toLowerCase();

    // Check options for select/radio/checkbox
    if (["select", "radio", "checkbox"].includes(normalizedType)) {
      if (!options || !Array.isArray(options) || options.filter((o) => o && o.trim()).length === 0) {
        return res.status(400).json({
          message: "At least one option is required for Select, Radio, or Checkbox fields.",
        });
      }
    }

    const form = await FormModel.getForm("internship_registration");
    const section = form.sections.find((s) => s.id === sectionId);

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    // Generate unique ID across all fields in the form
    let baseId = slugify(label);
    if (!baseId) baseId = `field_${Date.now()}`;
    let fieldId = baseId;
    let counter = 1;

    const allFieldIds = new Set();
    form.sections.forEach((sec) => {
      sec.fields.forEach((f) => allFieldIds.add(f.id));
    });

    while (allFieldIds.has(fieldId)) {
      fieldId = `${baseId}_${counter++}`;
    }

    const cleanOptions = Array.isArray(options)
      ? options.map((opt) => opt.toString().trim()).filter(Boolean)
      : [];

    const newField = {
      id: fieldId,
      label: label.trim(),
      type: normalizedType,
      placeholder: placeholder ? placeholder.trim() : "",
      required: Boolean(required),
      options: cleanOptions,
      order: section.fields.length,
    };

    section.fields.push(newField);
    await form.save();

    return res.status(201).json({
      success: true,
      message: "Field added successfully",
      form,
      field: newField,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ PUT /api/form-builder/sections/:sectionId/fields/:fieldId (Edit field)
formBuilderController.updateField = async (req, res, next) => {
  try {
    const { sectionId, fieldId } = req.params;
    const { label, type, placeholder, required, options } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({ message: "Field label is required" });
    }

    const allowedTypes = [
      "text",
      "number",
      "email",
      "password",
      "date",
      "phone",
      "textarea",
      "checkbox",
      "radio",
      "select",
      "file",
    ];

    if (!type || !allowedTypes.includes(type.toLowerCase())) {
      return res.status(400).json({
        message: `Field type must be one of: ${allowedTypes.join(", ")}`,
      });
    }

    const normalizedType = type.toLowerCase();

    if (["select", "radio", "checkbox"].includes(normalizedType)) {
      if (!options || !Array.isArray(options) || options.filter((o) => o && o.trim()).length === 0) {
        return res.status(400).json({
          message: "At least one option is required for Select, Radio, or Checkbox fields.",
        });
      }
    }

    const form = await FormModel.getForm("internship_registration");
    const section = form.sections.find((s) => s.id === sectionId);

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const field = section.fields.find((f) => f.id === fieldId);
    if (!field) {
      return res.status(404).json({ message: "Field not found" });
    }

    field.label = label.trim();
    field.type = normalizedType;
    field.placeholder = placeholder !== undefined ? placeholder.trim() : field.placeholder;
    field.required = Boolean(required);
    field.options = Array.isArray(options)
      ? options.map((opt) => opt.toString().trim()).filter(Boolean)
      : [];

    await form.save();

    return res.status(200).json({
      success: true,
      message: "Field updated successfully",
      form,
      field,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ DELETE /api/form-builder/sections/:sectionId/fields/:fieldId (Delete field)
formBuilderController.deleteField = async (req, res, next) => {
  try {
    const { sectionId, fieldId } = req.params;
    const form = await FormModel.getForm("internship_registration");

    const section = form.sections.find((s) => s.id === sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const fieldIndex = section.fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex === -1) {
      return res.status(404).json({ message: "Field not found" });
    }

    section.fields.splice(fieldIndex, 1);
    // Reorder remaining fields in the section
    section.fields.forEach((f, idx) => {
      f.order = idx;
    });

    await form.save();

    return res.status(200).json({
      success: true,
      message: "Field deleted successfully",
      form,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ PUT /api/form-builder/sections/:sectionId/reorder (Reorder fields in a section)
formBuilderController.reorderFields = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { fieldIds } = req.body; // Array of field id strings in desired order

    if (!fieldIds || !Array.isArray(fieldIds)) {
      return res.status(400).json({ message: "fieldIds array is required" });
    }

    const form = await FormModel.getForm("internship_registration");
    const section = form.sections.find((s) => s.id === sectionId);

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const fieldMap = new Map();
    section.fields.forEach((f) => fieldMap.set(f.id, f));

    const reordered = [];
    fieldIds.forEach((id, index) => {
      if (fieldMap.has(id)) {
        const item = fieldMap.get(id);
        item.order = index;
        reordered.push(item);
        fieldMap.delete(id);
      }
    });

    // Append any remaining fields that were not in fieldIds
    fieldMap.forEach((item) => {
      item.order = reordered.length;
      reordered.push(item);
    });

    section.fields = reordered;
    await form.save();

    return res.status(200).json({
      success: true,
      message: "Fields reordered successfully",
      form,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ POST /api/form-builder/reset (Reset to default structure)
formBuilderController.resetForm = async (req, res, next) => {
  try {
    const form = await FormModel.resetToDefault("internship_registration");
    return res.status(200).json({
      success: true,
      message: "Form reset to default configuration successfully",
      form,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ POST /api/form-builder/submit (Submit public registration form)
formBuilderController.submitApplication = async (req, res, next) => {
  try {
    const { formData } = req.body;
    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ message: "Form data is required" });
    }

    const form = await FormModel.getForm("internship_registration");

    // Validate required fields
    const missingFields = [];
    form.sections.forEach((sec) => {
      sec.fields.forEach((field) => {
        if (field.required) {
          const val = formData[field.id];
          if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
            missingFields.push(field.label);
          }
        }
      });
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Please fill in all required fields: ${missingFields.join(", ")}`,
        missingFields,
      });
    }

    const application = await InternshipApplication.create({
      formData,
    });

    return res.status(201).json({
      success: true,
      message: "Internship registration submitted successfully!",
      applicationNumber: application.applicationNumber,
      id: application._id,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ GET /api/form-builder/submissions (Admin view submissions)
formBuilderController.getSubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      InternshipApplication.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      InternshipApplication.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = formBuilderController;
