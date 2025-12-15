const { z } = require("zod");

const MemberSchema = z.object({
  user: z.string().min(1, "User ID is required"),
  role: z.enum(["Team Leader", "Member"], { 
    errorMap: () => ({ message: "Role must be Team Leader or Member" }) 
  })
});

const TeamSchema = z.object({
  teamName: z.string().min(1, "Team name is required"),
  members: z.array(MemberSchema).min(1, "At least one member is required"),
  field: z.enum(["Web Development", "Graphic Designing", "Digital Marketing"], {
    errorMap: () => ({ message: "Invalid field" })
  })
});

const UpdateTeamSchema = z.object({
  teamName: z.string().min(1, "Team name is required"),
  members: z.array(MemberSchema).min(1, "At least one member is required"),
  field: z.enum(["Web Development", "Graphic Designing", "Digital Marketing"], {
    errorMap: () => ({ message: "Invalid field" })
  })
});


module.exports = { UpdateTeamSchema ,TeamSchema };
