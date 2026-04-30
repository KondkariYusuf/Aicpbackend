import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { supabaseAdmin } from "../../config/supabase";

interface UserProfile {
  id: string;
  institute_id: string | null;
  role: "Clerk" | "HOD" | "Principal" | "Admin";
  full_name: string;
}

const extractBearerToken = (authorization?: string): string | null => {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req.header("Authorization"));

  if (!token) {
    next(new AppError("Missing or invalid Authorization header", 401));
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    next(new AppError("Unauthorized", 401, error?.message));
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, institute_id, role, full_name")
    .eq("id", data.user.id)
    .maybeSingle<UserProfile>();

  if (profileError || !profile) {
    next(new AppError("User profile not found", 403, profileError?.message));
    return;
  }

  req.auth = {
    user: data.user,
    profile,
    token
  };

  next();
};
