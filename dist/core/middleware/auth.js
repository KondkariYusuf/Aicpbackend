"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const AppError_1 = require("../errors/AppError");
const supabase_1 = require("../../config/supabase");
const extractBearerToken = (authorization) => {
    if (!authorization) {
        return null;
    }
    const [scheme, token] = authorization.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return null;
    }
    return token;
};
const authenticate = async (req, _res, next) => {
    const token = extractBearerToken(req.header("Authorization"));
    if (!token) {
        next(new AppError_1.AppError("Missing or invalid Authorization header", 401));
        return;
    }
    const { data, error } = await supabase_1.supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
        next(new AppError_1.AppError("Unauthorized", 401, error?.message));
        return;
    }
    const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
        .from("users")
        .select("id, institute_id, role, full_name")
        .eq("id", data.user.id)
        .maybeSingle();
    if (profileError || !profile) {
        next(new AppError_1.AppError("User profile not found", 403, profileError?.message));
        return;
    }
    req.auth = {
        user: data.user,
        profile,
        token
    };
    next();
};
exports.authenticate = authenticate;
