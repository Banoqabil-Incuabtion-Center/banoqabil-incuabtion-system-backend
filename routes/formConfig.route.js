const express = require('express');
const router = express.Router();
const formConfigController = require('../controllers/formConfig.controller');

// Admin routes for form configuration
router.post('/', formConfigController.createFormField);
router.get('/', formConfigController.getAllFormFields);
router.get('/:id', formConfigController.getFormFieldById);
router.put('/:id', formConfigController.updateFormField);
router.delete('/:id', formConfigController.deleteFormField);

module.exports = router;
