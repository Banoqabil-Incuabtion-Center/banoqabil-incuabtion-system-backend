const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller")
const attController = require("../controllers/attendance.controller")
const validate = require("../middlewares/form-validator.middleware")
const { registerSchema, updateRegisterSchema, loginSchema } = require("../validators/auth.validation");
const { protect } = require("../middlewares/auth.middleware");
const userPostController = require("../controllers/user-post.controller");
const { uploadPostImage, uploadAvatar } = require("../config/multer.config");

//admin access users
router.get("/signup", authController.signupGet)
router.post("/signup", validate(registerSchema), authController.signupPost)
router.post("/login", validate(loginSchema), authController.loginPost)
router.get("/profile", protect, authController.loginGet)
router.post("/refresh-token", authController.refreshAccessToken)

router.post("/logout", authController.logout)
router.put("/update/:_id", validate(updateRegisterSchema), authController.updateUser)
router.delete("/delete/:_id", authController.deleteUser)
router.get("/enums", authController.getenums)


router.get('/activities', protect, authController.getActivities);
router.get('/active-users', protect, authController.getActiveUsers);
// Avatar upload route
router.post("/avatar", protect, uploadAvatar.single('avatar'), authController.updateAvatar);

// Post routes with image upload
router.post("/createpost", protect, uploadPostImage.single('image'), userPostController.createUserPost);
router.get("/getuserpost", protect, userPostController.getUserPosts);
router.get("/getuserpost/stats", protect, userPostController.getUserPostsWithStats); // Optimized with like/comment counts
router.put("/updateuserpost", protect, uploadPostImage.single('image'), userPostController.updateUserPost);
router.delete("/deleteuserpost", protect, userPostController.deleteUserPost);


module.exports = router;