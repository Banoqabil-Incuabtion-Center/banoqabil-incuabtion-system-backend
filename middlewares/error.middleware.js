const Log = require("../models/log.model");

// Sensitive keys to filter out
const SENSITIVE_KEYS = [
    "password",
    "confirmPassword",
    "token",
    "refreshToken",
    "authorization",
    "creditCard",
    "cvv",
];

const sanitize = (obj) => {
    if (!obj) return {};
    const cleanObj = { ...obj };

    // Recursively sanitize
    const sanitizeValue = (value) => {
        if (typeof value === "object" && value !== null) {
            if (Array.isArray(value)) {
                return value.map(sanitizeValue);
            }
            const newObj = { ...value };
            for (const key in newObj) {
                if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
                    newObj[key] = "***SANITIZED***";
                } else {
                    newObj[key] = sanitizeValue(newObj[key]);
                }
            }
            return newObj;
        }
        return value;
    };

    for (const key in cleanObj) {
        if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
            cleanObj[key] = "***SANITIZED***";
        } else {
            cleanObj[key] = sanitizeValue(cleanObj[key]);
        }
    }
    return cleanObj;
};

const errorMiddleware = async (err, req, res, next) => {
    try {
        const errorData = {
            level: "error",
            message: err.message || "Internal Server Error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
            route: req.originalUrl,
            method: req.method,
            userId: req.user ? req.user.id : null,
            body: sanitize(req.body),
            query: sanitize(req.query),
            params: sanitize(req.params),
            ip: req.ip,
        };

        // Log to console in dev
        if (process.env.NODE_ENV !== "production") {
            console.error("❌ Error caught by middleware:", err);
        }

        // Save to MongoDB
        // Don't await this to avoid delaying the response
        Log.create(errorData).catch(logErr => console.error("❌ Failed to save error log:", logErr));

    } catch (loggingError) {
        console.error("❌ Error in error middleware:", loggingError);
    }

    // Send response
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        message: err.message || "Server Error",
        details: err.details || err.message, // Maintain backward compatibility with current controllers
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};

module.exports = errorMiddleware;
