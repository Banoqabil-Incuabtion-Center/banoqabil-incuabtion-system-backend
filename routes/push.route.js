const express = require('express');
const router = express.Router();
const pushController = require('../controllers/push.controller');
const auth = require('../middlewares/auth.middleware');

router.post('/subscribe', auth.protect, pushController.subscribe);
router.post('/test', auth.protect, pushController.sendTestPush);

module.exports = router;
