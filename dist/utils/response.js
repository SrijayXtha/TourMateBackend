"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRole = exports.validatePassword = exports.validateEmail = exports.validateRequired = exports.sendError = exports.sendSuccess = void 0;
/**
 * Send a success response
 */
const sendSuccess = (res, statusCode, message, data) => {
    const response = {
        status: "success",
        message,
        ...(data && { data }),
    };
    return res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
/**
 * Send an error response
 */
const sendError = (res, statusCode, message) => {
    const response = {
        status: "error",
        message,
    };
    return res.status(statusCode).json(response);
};
exports.sendError = sendError;
/**
 * Validate required fields
 */
const validateRequired = (data, fields) => {
    for (const field of fields) {
        if (!data[field] || (typeof data[field] === "string" && !data[field].trim())) {
            return `${field} is required`;
        }
    }
    return null;
};
exports.validateRequired = validateRequired;
/**
 * Validate email format
 */
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
/**
 * Validate password strength (minimum 6 characters)
 */
const validatePassword = (password) => {
    return password.length >= 6;
};
exports.validatePassword = validatePassword;
/**
 * Validate role
 */
const validateRole = (role) => {
    const validRoles = ["tourist", "guide", "hotel"];
    return validRoles.includes(role.toLowerCase());
};
exports.validateRole = validateRole;
