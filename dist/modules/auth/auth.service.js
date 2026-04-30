"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const AppError_1 = require("../../core/errors/AppError");
const supabase_1 = require("../../config/supabase");
exports.authService = {
    signup: async (payload) => {
        const { data: createdAuthUser, error: createUserError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
            email: payload.email,
            password: payload.password,
            email_confirm: true
        });
        if (createUserError || !createdAuthUser.user) {
            throw new AppError_1.AppError("Failed to create authentication user", 400, createUserError?.message);
        }
        const userId = createdAuthUser.user.id;
        const { error: profileError } = await supabase_1.supabaseAdmin.from("users").insert({
            id: userId,
            institute_id: payload.instituteId,
            full_name: payload.fullName,
            role: payload.role,
            phone: payload.phoneNumber ?? null
        });
        if (profileError) {
            await supabase_1.supabaseAdmin.auth.admin.deleteUser(userId);
            throw new AppError_1.AppError("Failed to create user profile", 400, profileError.message);
        }
        return {
            id: userId,
            email: payload.email,
            fullName: payload.fullName,
            role: payload.role,
            instituteId: payload.instituteId,
            phoneNumber: payload.phoneNumber ?? null
        };
    },
    login: async (payload) => {
        const { data, error } = await supabase_1.supabaseAuth.auth.signInWithPassword({
            email: payload.email,
            password: payload.password
        });
        if (error || !data.session || !data.user) {
            throw new AppError_1.AppError("Invalid credentials", 401, error?.message);
        }
        return {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresIn: data.session.expires_in,
            tokenType: data.session.token_type,
            user: {
                id: data.user.id,
                email: data.user.email
            }
        };
    }
};
