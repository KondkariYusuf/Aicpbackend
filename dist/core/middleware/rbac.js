"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
const AppError_1 = require("../errors/AppError");
const authorizeRoles = (...allowedRoles) => {
    return (req, _res, next) => {
        const role = req.auth?.profile.role;
        if (!role) {
            next(new AppError_1.AppError("Unauthorized", 401));
            return;
        }
        if (!allowedRoles.includes(role)) {
            next(new AppError_1.AppError("Forbidden", 403));
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
