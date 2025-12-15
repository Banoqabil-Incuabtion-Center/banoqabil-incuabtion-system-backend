// middleware/validateObjectId.js
const mongoose = require('mongoose');

const validateObjectId = (paramName = '_id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    // Check if ID exists
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ 
        error: `${paramName} is required` 
      });
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id) || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ 
        error: `Invalid ${paramName} format` 
      });
    }
    
    next();
  };
};

module.exports = validateObjectId;