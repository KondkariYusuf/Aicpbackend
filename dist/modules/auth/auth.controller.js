"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("./auth.service");
const auth_schemas_1 = require("./auth.schemas");
exports.authController = {
    signup: async (req, res) => {
        const payload = auth_schemas_1.signupSchema.parse(req.body);
        const user = await auth_service_1.authService.signup(payload);
        res.status(201).json({
            success: true,
            data: user
        });
    },
    login: async (req, res) => {
        const payload = auth_schemas_1.loginSchema.parse(req.body);
        const session = await auth_service_1.authService.login(payload);
        res.status(200).json({
            success: true,
            data: session
        });
    }
};
