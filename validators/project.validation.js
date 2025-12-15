const { z } = require("zod");

const ProjectSchema = z.object({
  title: z.string().min(5, "Title name should be atleast consist of 5 characters"),
  description: z.string().min(20, "Description should be atleast  of 20 characters"),
  teamName: z.string().min(1, "Please choose a team"),
  PM: z.string().min(1, "Please choose a project manager"),
 
});

const UpdateProjectSchema = z.object({
  title: z.string().min(5, "Title is required"),
  description: z.string().min(100, "Description  is required"),
  teamName: z.string().min(1, "Please choose a team"),
  PM: z.string().min(1, "Please choose a project manager"),
 
});

module.exports = { ProjectSchema , UpdateProjectSchema};