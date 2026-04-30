/**
 * One-time Admin seed script.
 * Run: npx tsx seed-admin.ts
 *
 * Creates the Super Admin user in both auth.users and public.users.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ADMIN_EMAIL = "anjuman.admin@mhssce.in";
const ADMIN_PASSWORD = "s$A/IA:54Q4t";
const ADMIN_FULL_NAME = "Super Admin";

async function seedAdmin() {
  console.log("Creating Super Admin auth user...");

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true
  });

  if (authError) {
    // Check if user already exists
    if (authError.message?.includes("already been registered")) {
      console.log("Admin auth user already exists. Skipping auth creation.");

      // Try to find existing user
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("Failed to list users:", listError.message);
        process.exit(1);
      }

      const existingUser = users?.find(u => u.email === ADMIN_EMAIL);
      if (!existingUser) {
        console.error("Could not find existing admin user");
        process.exit(1);
      }

      // Upsert profile
      const { error: profileError } = await supabase.from("users").upsert({
        id: existingUser.id,
        institute_id: null,
        full_name: ADMIN_FULL_NAME,
        role: "Admin"
      }, { onConflict: "id" });

      if (profileError) {
        console.error("Failed to upsert admin profile:", profileError.message);
        process.exit(1);
      }

      console.log("✅ Admin profile upserted successfully!");
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   User ID: ${existingUser.id}`);
      return;
    }

    console.error("Failed to create admin auth user:", authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`Auth user created: ${userId}`);

  // Insert profile into public.users
  const { error: profileError } = await supabase.from("users").insert({
    id: userId,
    institute_id: null,
    full_name: ADMIN_FULL_NAME,
    role: "Admin"
  });

  if (profileError) {
    console.error("Failed to create admin profile:", profileError.message);
    console.log("Cleaning up auth user...");
    await supabase.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  console.log("✅ Super Admin seeded successfully!");
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   User ID: ${userId}`);
}

seedAdmin().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
