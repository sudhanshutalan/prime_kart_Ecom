import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  console.log("[ERROR HANDLER] Error caught:", err);
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || "Something went wrong";
    let errors = error?.errors || [];

    // Handle PostgreSQL unique constraint violation
    if (err.code === "23505") {
      statusCode = 409;
      message = "Duplicate value. Resource already exists";
      const field = err.detail?.match(/\(([^)]+)\)/)?.[1];
      errors = field ? [{ field, message }] : [];
    }

    // Handle PostgreSQL foreign key constraint violation
    if (err.code === "23503") {
      statusCode = 400;
      message = "Invalid reference. Related resource not found";
    }

    // Handle PostgreSQL not null constraint violation
    if (err.code === "23502") {
      statusCode = 400;
      const field = err.column;
      message = `${field} is required`;
      errors = [{ field, message }];
    }

    // Handle Sequelize validation errors (if using Sequelize)
    if (err.name === "SequelizeValidationError") {
      statusCode = 400;
      message = "Validation failed";
      errors = err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      }));
    }

    // Handle JWT errors
    if (err.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token";
    }

    if (err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token expired";
    }

    error = new ApiError(statusCode, message, errors, err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    ...(error.errors?.length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
};

export { errorHandler };
