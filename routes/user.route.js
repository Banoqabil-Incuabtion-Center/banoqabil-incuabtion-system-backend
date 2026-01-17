const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller")
const attController = require("../controllers/attendance.controller")
const validate = require("../middlewares/form-validator.middleware")
const { registerSchema, updateRegisterSchema, loginSchema } = require("../validators/auth.validation");
const { createPostSchema, updatePostSchema } = require("../validators/post.validation");
const { protect } = require("../middlewares/auth.middleware");
const userPostController = require("../controllers/user-post.controller");
const { uploadPostImage, uploadAvatar } = require("../config/multer.config");

//admin access users
router.get("/signup", authController.signupGet)
router.post("/signup", validate(registerSchema), authController.signupPost)
router.post("/login", validate(loginSchema), authController.loginPost)
router.get("/profile", protect, authController.loginGet)
router.get("/public/:id", protect, authController.getUserById)
router.post("/refresh-token", authController.refreshAccessToken)

router.post("/logout", authController.logout)
router.post("/forgot-password", authController.forgotPassword)
router.post("/reset-password/:token", authController.resetPassword)
router.post("/forgot-password", authController.forgotPassword)
router.post("/reset-password/:token", authController.resetPassword)
router.post("/resend-verification", authController.resendVerificationEmail)
router.get("/verify-email/:token", authController.verifyEmail)
router.patch("/verify-user/:id", protect, authController.adminVerifyUser)
router.put("/update/:_id", protect, validate(updateRegisterSchema), authController.updateUser)
router.delete("/delete/:_id", protect, authController.deleteUser)
router.get("/enums", authController.getenums)
router.post("/test-email", authController.sendTestEmail)


router.get('/activities', protect, authController.getActivities);
router.get('/active-users', protect, authController.getActiveUsers);
// Avatar upload route
router.post("/avatar", protect, uploadAvatar.single('avatar'), authController.updateAvatar);

// Post routes with image upload
router.post("/createpost", protect, uploadPostImage.array('images', 9), validate(createPostSchema), userPostController.createUserPost);
router.get("/getuserpost", protect, userPostController.getUserPosts);
router.get("/getuserpost/stats", protect, userPostController.getUserPostsWithStats);
router.get("/getuserpost/:id", protect, userPostController.getPostDetail);
router.put("/updateuserpost", protect, uploadPostImage.array('images', 9), validate(updatePostSchema), userPostController.updateUserPost);
router.delete("/deleteuserpost", protect, userPostController.deleteUserPost);


module.exports = router;