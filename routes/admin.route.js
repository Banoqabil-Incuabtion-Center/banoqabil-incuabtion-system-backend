const express = require("express");
const router = express.Router();
const postController = require("../controllers/post.controller");
const { uploadPostImage } = require("../config/multer.config");
const PMcontroller = require("../controllers/pm.controller");
const { TeamController } = require("../controllers/team.controller");
const { ProjectController } = require("../controllers/project.controller");
const validate = require("../middlewares/form-validator.middleware")
const { TeamSchema, UpdateTeamSchema } = require("../validators/team.validation");
const { ProjectSchema, UpdateProjectSchema } = require("../validators/project.validation");
const adminController = require("../controllers/admin.controller");


router.post("/login", adminController.loginAdmin)
router.post("/create", adminController.createAdmin)

//admin access posts
router.post("/post", uploadPostImage.single('image'), postController.createPost)
router.get("/post", postController.getPosts)
router.put("/post/:id", uploadPostImage.single('image'), postController.updatePost)
router.delete("/post/:id", postController.deletePost)

//admin access PMs
router.post("/pm", PMcontroller.createPM)
router.get("/pm", PMcontroller.getPMs)
router.put("/pm/:id", PMcontroller.updatePM)
router.delete("/pm/:id", PMcontroller.deletePM)


router.get("/team", TeamController.teamGet)
router.post("/createteam", validate(TeamSchema), TeamController.createteamPost)
router.delete("/team/:id", TeamController.deleteteam);
router.put("/team/:id", validate(UpdateTeamSchema), TeamController.updateteam);
router.get("/team/fields", TeamController.fields);

router.get("/project", ProjectController.getProjects)
router.post("/createproject", validate(ProjectSchema), ProjectController.projectPost)
router.put("/project/:id", validate(UpdateProjectSchema), ProjectController.updateProject)
router.delete("/project/:id", ProjectController.deleteProject)


module.exports = router;