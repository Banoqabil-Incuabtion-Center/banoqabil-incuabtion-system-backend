const express = require('express');
const router = express.Router();
const formConfigController = require('../controllers/formConfig.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');

// Public: the landing page reads the form layout
router.get('/', formConfigController.getAllFormFields);
router.get('/:id', formConfigController.getFormFieldById);

// Admin routes for form configuration
router.post('/', protect, adminOnly, formConfigController.createFormField);
router.put('/:id', protect, adminOnly, formConfigController.updateFormField);
router.delete('/:id', protect, adminOnly, formConfigController.deleteFormField);

module.exports = router;
