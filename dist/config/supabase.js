"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAuth = exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
exports.supabaseAdmin = (0, supabase_js_1.createClient)(env_1.env.SUPABASE_URL, env_1.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
exports.supabaseAuth = (0, supabase_js_1.createClient)(env_1.env.SUPABASE_URL, env_1.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
