const { default: mongoose } = require('mongoose');
const Team = require('../models/team.model');
const User = require("../models/user.model");
const paginate = require('../utils/paginate.util');

const TeamController = {};


TeamController.teamGet = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      model: Team,
      page,
      limit,
      query: { deletedAt: null },  // all non-deleted teams
      sort: { createdAt: -1 },  // latest teams first
      populate: { path: "members.user", select: "name" }  // populate nested members
    });

    res.status(200).json(result);

  } catch (error) {
    console.error("Error Fetching Teams:", error);
    res.status(500).json({ message: 'Error Fetching Teams', error });
  }
};

TeamController.createteamPost = async (req, res) => {
  try {
    const { teamName, members, field } = req.validatedData;

    // Check if team name already exists
    const existingTeam = await Team.findOne({ teamName });
    if (existingTeam) {
      return res.status(400).json({
        field: "teamName",
        message: "This name is already taken, please try another",
      });
    }

    // Validate members (check if users exist)
    const userIds = members.map(m => new mongoose.Types.ObjectId(m.user));
    const validUsers = await User.find({ _id: { $in: userIds } });

    if (validUsers.length !== members.length) {
      return res.status(400).json({
        field: "members",
        message: "Some user IDs are invalid",
      });
    }

    // Ensure exactly one Team Leader
    const leaders = members.filter(m => m.role === "Team Leader");
    if (leaders.length !== 1) {
      return res.status(400).json({
        field: "members",
        message: "Team must have exactly one Team Leader",
      });
    }

    // Create team
    await Team.create({
      teamName,
      members: members.map(m => ({
        user: new mongoose.Types.ObjectId(m.user),
        role: m.role
      })),
      field,
    });

    return res.status(200).json({ message: "Team created successfully" });
  } catch (error) {
    console.error("Error creating Team:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};


TeamController.fields = async (req, res) => {
  const fieldEnumValues = Team.schema.path("field").enumValues;
  res.json(fieldEnumValues);
}

TeamController.updateteam = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamName, members, field } = req.validatedData;



    const leaderCount = members.filter(m => m.role === "Team Leader").length;
    if (leaderCount !== 1) {
      return res.status(400).json({ message: "There must be exactly one Team Leader" });
    }

    const userIds = members.map(m => m.user);
    const validUsers = await User.find({ _id: { $in: userIds } });
    if (validUsers.length !== userIds.length) {
      return res.status(400).json({ message: "Invalid user IDs in members" });


    }

    await Team.findByIdAndUpdate(id, { teamName, members, field }, { new: true });
    res.status(200).json({ message: "Team updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

TeamController.deleteteam = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Team.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!deleted) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { TeamController };
