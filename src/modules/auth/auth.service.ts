import { AppError } from "../../core/errors/AppError";
import { supabaseAdmin, supabaseAuth } from "../../config/supabase";
import type { LoginInput, SignupInput } from "./auth.schemas";

export const authService = {
  signup: async (payload: SignupInput) => {
    const { data: createdAuthUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true
    });

    if (createUserError || !createdAuthUser.user) {
      throw new AppError("Failed to create authentication user", 400, createUserError?.message);
    }

    const userId = createdAuthUser.user.id;

    const { error: profileError } = await supabaseAdmin.from("users").insert({
      id: userId,
      institute_id: payload.instituteId,
      full_name: payload.fullName,
      role: payload.role,
      phone: payload.phoneNumber ?? null
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new AppError("Failed to create user profile", 400, profileError.message);
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

  login: async (payload: LoginInput) => {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });

    if (error || !data.session || !data.user) {
      throw new AppError("Invalid credentials", 401, error?.message);
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
