import { Response } from "express";

export interface SuccessResponse<T = any> {
  status: "success";
  message: string;
  data?: T;
}

export interface ErrorResponse {
  status: "error";
  message: string;
}

/**
 * Send a success response
 */
export const sendSuccess = <T = any>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): Response => {
  const response: SuccessResponse<T> = {
    status: "success",
    message,
    ...(data && { data }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  statusCode: number,
  message: string
): Response => {
  const response: ErrorResponse = {
    status: "error",
    message,
  };
  return res.status(statusCode).json(response);
};

/**
 * Validate required fields
 */
export const validateRequired = (data: Record<string, any>, fields: string[]): string | null => {
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === "string" && !data[field].trim())) {
      return `${field} is required`;
    }
  }
  return null;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength (minimum 6 characters)
 */
export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Validate role
 */
export const validateRole = (role: string): boolean => {
  const validRoles = ["tourist", "guide", "hotel"];
  return validRoles.includes(role.toLowerCase());
};
