import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company_name: string | null;
          billing_address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company_name?: string | null;
          billing_address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          company_name?: string | null;
          billing_address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      revenue_records: {
        Row: {
          id: string;
          customer_id: string;
          type: "daytime" | "transfer" | "other";
          title: string;
          items: Json;
          total_amount: number;
          currency: string;
          notes: string | null;
          source: string | null;
          invoice_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          type: "daytime" | "transfer" | "other";
          title: string;
          items?: Json;
          total_amount: number;
          currency?: string;
          notes?: string | null;
          source?: string | null;
          invoice_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          type?: "daytime" | "transfer" | "other";
          title?: string;
          items?: Json;
          total_amount?: number;
          currency?: string;
          notes?: string | null;
          source?: string | null;
          invoice_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          customer_id: string;
          revenue_record_id: string;
          status: "draft" | "issued" | "paid" | "void";
          currency: string;
          items: Json;
          subtotal: number;
          total_amount: number;
          issued_at: string;
          due_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          customer_id: string;
          revenue_record_id: string;
          status: "draft" | "issued" | "paid" | "void";
          currency?: string;
          items?: Json;
          subtotal: number;
          total_amount: number;
          issued_at?: string;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          customer_id?: string;
          revenue_record_id?: string;
          status?: "draft" | "issued" | "paid" | "void";
          currency?: string;
          items?: Json;
          subtotal?: number;
          total_amount?: number;
          issued_at?: string;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

let adminClient: SupabaseClient<Database> | null = null;

export class SupabaseConfigError extends Error {
  statusCode = 503;
}

export class SupabaseConnectionError extends Error {
  statusCode = 503;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new SupabaseConfigError(`${name} is required for Supabase persistence.`);
  }

  return value;
}

function getSupabaseUrl(): string {
  const value = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!value) {
    throw new SupabaseConfigError(
      "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required for Supabase persistence.",
    );
  }

  if (value.includes("your-project-id.supabase.co")) {
    throw new SupabaseConfigError("Supabase URL still uses the example placeholder value.");
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new SupabaseConfigError("Supabase URL must be a valid absolute URL.");
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new SupabaseConfigError("Supabase URL must start with http:// or https://.");
  }

  return value;
}

function getServiceRoleKey(): string {
  const value = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (value === "your-service-role-key") {
    throw new SupabaseConfigError("SUPABASE_SERVICE_ROLE_KEY still uses the example placeholder value.");
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new SupabaseConfigError(
      "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must not be defined. Keep the service role key server-side only.",
    );
  }

  const payload = decodeJwtPayload(value);
  const role = typeof payload?.role === "string" ? payload.role : null;

  if (role && role !== "service_role") {
    throw new SupabaseConfigError(
      `SUPABASE_SERVICE_ROLE_KEY must be a service-role key. Received a key with role "${role}".`,
    );
  }

  return value;
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  });

  return adminClient;
}

export async function assertSupabaseConnection(): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("customers").select("id", { head: true, count: "exact" });

  if (error) {
    throw new SupabaseConnectionError(`Supabase connection check failed: ${error.message}`);
  }
}
