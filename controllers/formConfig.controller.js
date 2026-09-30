const FormConfig = require('../models/formConfig.model');

// Add a new dynamic field configuration
exports.createFormField = async (req, res) => {
  try {
    const { label, name, type, required, options } = req.body;

    const existingField = await FormConfig.findOne({ name });
    if (existingField) {
      return res.status(400).json({ message: 'A field with this name already exists.' });
    }

    const newField = new FormConfig({
      label,
      name,
      type,
      required,
      options,
    });

    await newField.save();
    res.status(201).json({ message: 'Form field created successfully', data: newField });
  } catch (error) {
    console.error('Error creating form field:', error);
    res.status(500).json({ message: 'Failed to create form field', error: error.message });
  }
};

// Get all dynamic field configurations
exports.getAllFormFields = async (req, res) => {
  try {
    const fields = await FormConfig.find();
    res.status(200).json({ data: fields });
  } catch (error) {
    console.error('Error fetching form fields:', error);
    res.status(500).json({ message: 'Failed to fetch form fields', error: error.message });
  }
};

// Update an existing dynamic field configuration
exports.updateFormField = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedField = await FormConfig.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedField) {
      return res.status(404).json({ message: 'Form field not found' });
    }

    res.status(200).json({ message: 'Form field updated successfully', data: updatedField });
  } catch (error) {
    console.error('Error updating form field:', error);
    res.status(500).json({ message: 'Failed to update form field', error: error.message });
  }
};

// Delete a dynamic field configuration
exports.deleteFormField = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedField = await FormConfig.findByIdAndDelete(id);

    if (!deletedField) {
      return res.status(404).json({ message: 'Form field not found' });
    }

    res.status(200).json({ message: 'Form field deleted successfully' });
  } catch (error) {
    console.error('Error deleting form field:', error);
    res.status(500).json({ message: 'Failed to delete form field', error: error.message });
  }
};
