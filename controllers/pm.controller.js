const PMModel = require("../models/pm.model");
const bcrypt = require("bcrypt");
const paginate = require("../utils/paginate.util");

const PMcontroller = {};

PMcontroller.createPM = async (req, res) => {
    try {
        const { name, email, password, role, projects } = req.body;

        const existingPM = await PMModel.findOne({ email, deletedAt: null });
        if (existingPM) {
            return res.status(400).json({ message: "PM already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const pm = await PMModel.create({ name, email, password: hash, role, projects });

        res.status(201).json({ message: "PM created successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

PMcontroller.getPMs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await paginate({
            model: PMModel,
            page,
            limit,
            query: { deletedAt: null }, // all non-deleted PMs
            sort: { createdAt: -1 }, // latest PM first
            populate: null
        });

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


PMcontroller.updatePM = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, role, projects } = req.body;

        const pm = await PMModel.findByIdAndUpdate(id, { name, email, password, role, projects }, { new: true });
        res.status(200).json({ message: "PM updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

PMcontroller.deletePM = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await PMModel.findByIdAndUpdate(
            id,
            { deletedAt: new Date() },
            { new: true }
        );
        if (!deleted) {
            return res.status(404).json({ message: "PM not found" });
        }
        res.status(200).json({ message: "PM deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = PMcontroller;