const InternSubmission = require('../models/internSubmission.model');

// Save a new intern registration submission
exports.submitRegistration = async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      gender,
      address,
      emailAddress,
      phoneNumber,
      guardianNumber,
      cnicNumber,
      fatherOrGuardianName,
      course,
      teacherName,
      campus,
      obtainedMarks,
      aboutYou,
      dynamicData,
    } = req.body;

    // Create the submission object
    const newSubmission = new InternSubmission({
      fullName,
      dateOfBirth,
      gender,
      address,
      emailAddress,
      phoneNumber,
      guardianNumber,
      cnicNumber,
      fatherOrGuardianName,
      course,
      teacherName,
      campus,
      obtainedMarks,
      aboutYou,
      dynamicData: dynamicData || {}, // For dynamic form builder fields
    });

    await newSubmission.save();
    res.status(201).json({ message: 'Registration submitted successfully', data: newSubmission });
  } catch (error) {
    console.error('Error submitting registration:', error);
    res.status(500).json({ message: 'Failed to submit registration', error: error.message });
  }
};

// Get all intern registrations
exports.getAllRegistrations = async (req, res) => {
  try {
    const registrations = await InternSubmission.find().sort({ createdAt: -1 });
    res.status(200).json({ data: registrations });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ message: 'Failed to fetch registrations', error: error.message });
  }
};

// Get a single intern registration by ID
exports.getRegistrationById = async (req, res) => {
  try {
    const registration = await InternSubmission.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.status(200).json({ data: registration });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({ message: 'Failed to fetch registration', error: error.message });
  }
};
