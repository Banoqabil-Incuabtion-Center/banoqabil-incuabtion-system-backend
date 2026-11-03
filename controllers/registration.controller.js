const InternSubmission = require('../models/internSubmission.model');
const paginate = require('../utils/paginate.util');

const LIST_LIMIT_MAX = 100;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Express repeats a query key as an array; only accept plain strings as filters
const asString = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Save a new intern registration submission (body already validated and normalised by RegistrationSchema)
exports.submitRegistration = async (req, res) => {
  try {
    const data = req.validatedData;

    const duplicate = await InternSubmission.exists({ cnicNumber: data.cnicNumber, deletedAt: null });
    if (duplicate) {
      return res.status(409).json({
        field: 'cnicNumber',
        message: 'An application with this CNIC has already been submitted.',
      });
    }

    const submission = await InternSubmission.create(data);
    res.status(201).json({ message: 'Registration submitted successfully', id: submission._id });
  } catch (error) {
    console.error('Error submitting registration:', error);
    res.status(500).json({ message: 'Failed to submit registration. Please try again.' });
  }
};

// List registrations for the admin Applications page: ?page&limit&search&course&campus&status
exports.getAllRegistrations = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), LIST_LIMIT_MAX);
    const search = asString(req.query.search);
    const course = asString(req.query.course);
    const campus = asString(req.query.campus);
    const status = asString(req.query.status);

    const query = { deletedAt: null };
    if (course) query.course = course;
    if (campus) query.campus = campus;
    if (status === 'New') query.status = { $in: ['New', null] };
    else if (status) query.status = status;
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ fullName: rx }, { cnicNumber: rx }, { phoneNumber: rx }, { emailAddress: rx }];
    }

    const [result, grouped] = await Promise.all([
      paginate({ model: InternSubmission, page, limit, query }),
      InternSubmission.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: { $ifNull: ['$status', 'New'] }, count: { $sum: 1 } } },
      ]),
    ]);

    // Totals across all non-deleted submissions, independent of the current filters
    const statusCounts = { New: 0, Shortlisted: 0, Rejected: 0 };
    grouped.forEach(({ _id, count }) => {
      statusCounts[_id] = (statusCounts[_id] || 0) + count;
    });

    res.status(200).json({ ...result, statusCounts });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ message: 'Failed to fetch registrations' });
  }
};

// Get a single intern registration by ID
exports.getRegistrationById = async (req, res) => {
  try {
    const registration = await InternSubmission.findOne({ _id: req.params.id, deletedAt: null });
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.status(200).json({ data: registration });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({ message: 'Failed to fetch registration' });
  }
};

// Move a registration between New / Shortlisted / Rejected
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const registration = await InternSubmission.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { status: req.validatedData.status },
      { new: true }
    );
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.status(200).json({ message: 'Status updated', data: registration });
  } catch (error) {
    console.error('Error updating registration status:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

// Soft delete, like the other models
exports.deleteRegistration = async (req, res) => {
  try {
    const registration = await InternSubmission.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() }
    );
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.status(200).json({ message: 'Registration deleted' });
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({ message: 'Failed to delete registration' });
  }
};
