const mongoose = require("mongoose");

const defaultFormSections = [
  {
    id: "personal_information",
    title: "Personal Information",
    description: "Please provide your personal information.",
    order: 0,
    fields: [
      {
        id: "full_name",
        label: "Full name",
        type: "text",
        placeholder: "Enter your full name",
        required: true,
        options: [],
        order: 0,
      },
      {
        id: "date_of_birth",
        label: "Date of birth",
        type: "date",
        placeholder: "",
        required: true,
        options: [],
        order: 1,
      },
      {
        id: "gender",
        label: "Gender",
        type: "radio",
        placeholder: "",
        required: true,
        options: ["Male", "Female"],
        order: 2,
      },
      {
        id: "cnic_number",
        label: "CNIC number",
        type: "text",
        placeholder: "42101-xxxxxxx-x",
        required: true,
        options: [],
        order: 3,
      },
      {
        id: "father_guardian_name",
        label: "Father/Guardian name",
        type: "text",
        placeholder: "Enter father or guardian name",
        required: true,
        options: [],
        order: 4,
      },
      {
        id: "about_yourself",
        label: "About yourself",
        type: "textarea",
        placeholder: "Tell us a bit about yourself",
        required: true,
        options: [],
        order: 5,
      },
    ],
  },
  {
    id: "contact_information",
    title: "Contact Information",
    description: "Please provide your contact information.",
    order: 1,
    fields: [
      {
        id: "address",
        label: "Address",
        type: "text",
        placeholder: "Enter residential address",
        required: true,
        options: [],
        order: 0,
      },
      {
        id: "email_address",
        label: "Email address",
        type: "email",
        placeholder: "example@domain.com",
        required: true,
        options: [],
        order: 1,
      },
      {
        id: "phone_number",
        label: "Phone number",
        type: "phone",
        placeholder: "0300-1234567",
        required: true,
        options: [],
        order: 2,
      },
      {
        id: "guardian_number",
        label: "Guardian number",
        type: "phone",
        placeholder: "0300-1234567",
        required: false,
        options: [],
        order: 3,
      },
    ],
  },
  {
    id: "course_campus_details",
    title: "Course & Campus Details",
    description: "Please provide your course and campus preferences.",
    order: 2,
    fields: [
      {
        id: "course",
        label: "Course",
        type: "select",
        placeholder: "Select your course",
        required: true,
        options: [
          "Web Development",
          "Mobile App Development",
          "Cyber Security",
          "Game Development with Unity",
          "Graphic Designing",
          "Digital Marketing",
          "Data Science",
          "Data Analytics",
          "E-commerce",
          "Content Writing",
          "Video Editing",
        ],
        order: 0,
      },
      {
        id: "teacher_name",
        label: "Teacher name",
        type: "text",
        placeholder: "Enter teacher / instructor name",
        required: true,
        options: [],
        order: 1,
      },
      {
        id: "campus",
        label: "Campus",
        type: "select",
        placeholder: "Select campus",
        required: true,
        options: [
          "Bahadurabad",
          "Expo (Fossphorus)",
          "Clifton",
          "Idarah Noor e Haq",
          "Jamia Millia",
        ],
        order: 2,
      },
      {
        id: "obtained_marks",
        label: "Obtained marks",
        type: "number",
        placeholder: "Enter marks obtained",
        required: true,
        options: [],
        order: 3,
      },
    ],
  },
];

const fieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    placeholder: { type: String, default: "" },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    fields: [fieldSchema],
  },
  { _id: false }
);

const formSchema = new mongoose.Schema(
  {
    formKey: {
      type: String,
      required: true,
      unique: true,
      default: "internship_registration",
    },
    title: {
      type: String,
      default: "Registration Form",
    },
    subtitle: {
      type: String,
      default: "Manage the fields and sections used in the internship registration form.",
    },
    sections: [sectionSchema],
  },
  {
    timestamps: true,
    collection: "registration_forms",
  }
);

// Singleton-style retriever that auto-seeds if not present
formSchema.statics.getForm = async function (formKey = "internship_registration") {
  let form = await this.findOne({ formKey });
  if (!form) {
    form = await this.create({
      formKey,
      title: "Registration Form",
      subtitle: "Manage the fields and sections used in the internship registration form.",
      sections: defaultFormSections,
    });
  }
  return form;
};

// Reset helper
formSchema.statics.resetToDefault = async function (formKey = "internship_registration") {
  const updated = await this.findOneAndUpdate(
    { formKey },
    {
      title: "Registration Form",
      subtitle: "Manage the fields and sections used in the internship registration form.",
      sections: defaultFormSections,
    },
    { new: true, upsert: true }
  );
  return updated;
};

module.exports = {
  FormModel: mongoose.model("RegistrationForm", formSchema),
  defaultFormSections,
};
