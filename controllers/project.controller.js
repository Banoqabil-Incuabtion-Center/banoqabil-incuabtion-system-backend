const Project = require("../models/project.model");
const paginate = require("../utils/paginate.util");
ProjectController = {}


ProjectController.getProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      model: Project,
      page,
      limit,
      query: { deletedAt: null },  // fetch all non-deleted projects
      sort: { createdAt: -1 }, // latest projects first
      populate: [
        { path: "teamName", select: "teamName" },
        { path: "PM", select: "name" }
      ]
    });

    res.status(200).json(result);

  } catch (error) {
    console.error("Error Fetching Projects:", error);
    res.status(500).json({ message: 'Error Fetching Projects', error });
  }
};


ProjectController.projectPost = async (req, res) => {
  try {
    const { title, description, teamName, PM } = req.validatedData;

    // const imagePath = `/uploads/${req.file.filename}`;

    // Check if team name already exists
    const existingTeam = await Project.findOne({ teamName });
    if (existingTeam) {
      return res.status(400).json({
        message: "Another project is already assigned to this team , please choose another team.",
      });
    }

    const existingPM = await Project.findOne({ PM });
    if (existingPM) {
      return res.status(400).json({
        message: "Project Manager  is already assigned to another project.",
      });
    }


    // Create project
    await Project.create({
      title,
      description,
      // file: imagePath,
      teamName,
      PM
    });

    return res.status(200).json({ message: "Project assigned successfully" });
  } catch (error) {
    console.error("Error assigning project:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

ProjectController.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, teamName, PM } = req.validatedData;

    // let imagePath = existingImage;

    // if a new file is uploaded, replace the image
    // if (req.file) {
    //   imagePath = `/images/${req.file.filename}`;

    //   // Delete old image if exists and not same as default
    //   if (existingImage && fs.existsSync(path.join(__dirname, `../public${existingImage}`) )) {
    //     fs.unlinkSync(path.join(__dirname, `../public${existingImage}`));
    //   }
    // }

    await Project.findByIdAndUpdate(id, {
      title,
      description,
      teamName,
      PM
    });

    res.status(200).json({ message: "Project updated successfully" });
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

ProjectController.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Project.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!deleted) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting Project:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

module.exports = { ProjectController };
