const Att = require("../models/AttModel");
const User = require("../models/userModel");
const moment = require("moment-timezone");


const checkinValidation = async (_id) => {
    const user = await User.findById(_id);
    const shift = user.shift;
    if (!user || !shift) return { error: "User not found" };

    const now = moment().tz("Asia/Karachi");
    const today = now.format("YYYY-MM-DD"); 
    
    const fourPM = now.clone().set({ hour: 16, minute: 0, second: 0, millisecond: 0 });
    const threePM = now.clone().set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
    const tenAM = now.clone().set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const ninePM = now.clone().set({ hour: 21, minute: 0, second: 0, millisecond: 0 });

    if (shift === "Morning") {
        if (now.isAfter(threePM)) {
            return { error: "Check-in time for Morning shift is over" };
        }
    } else if (shift === "Evening") {
        if (now.isBefore(threePM)) {
            return { error: "Check-in time for Evening shift has not started yet" };
        }
        if (now.isAfter(ninePM)) {
            return { error: "Check-in time for Evening shift has over" };
        }
    }
}

module.exports = checkinValidation;