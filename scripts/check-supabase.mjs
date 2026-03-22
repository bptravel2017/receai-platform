import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const cwd = process.cwd();

function loadEnvFile(fileName) {
  const filePath = path.join(cwd, fileName);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = line.slice(0, separatorIndex).trim();

    if (!name || process.env[name]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[name] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function decodeJwtPayload(token) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

const supabaseUrl =
  process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is missing.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
}

if (supabaseUrl.includes("your-project-id.supabase.co")) {
  throw new Error("Supabase URL is still the example placeholder.");
}

if (serviceRoleKey === "your-service-role-key") {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is still the example placeholder.");
}

const serviceRolePayload = decodeJwtPayload(serviceRoleKey);

if (serviceRolePayload?.role && serviceRolePayload.role !== "service_role") {
  throw new Error(
    `SUPABASE_SERVICE_ROLE_KEY is not a service-role key. Received role "${serviceRolePayload.role}".`,
  );
}

console.log("Supabase env loaded.");
console.log(`URL source: ${process.env.SUPABASE_URL ? "SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_URL"}`);
console.log("Service role key: present");
console.log(
  `Public anon key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ? "present" : "missing"}`,
);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
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

const { error: connectionError } = await supabase
  .from("customers")
  .select("id", { head: true, count: "exact" });

if (connectionError) {
  throw new Error(`Connection check failed: ${connectionError.message}`);
}

console.log("Connection check: ok");

const marker = `supabase-check-${Date.now()}`;
const insertPayload = {
  name: marker,
  email: `${marker}@example.com`,
  notes: "Temporary customer inserted by scripts/check-supabase.mjs",
};

const { data: insertedCustomer, error: insertError } = await supabase
  .from("customers")
  .insert(insertPayload)
  .select("id, name, created_at")
  .single();

if (insertError) {
  throw new Error(`Insert test failed: ${insertError.message}`);
}

if (!insertedCustomer) {
  throw new Error("Insert test failed: Supabase returned no customer row.");
}

console.log(`Insert test: ok (${insertedCustomer.id})`);

const { error: deleteError } = await supabase.from("customers").delete().eq("id", insertedCustomer.id);

if (deleteError) {
  throw new Error(
    `Cleanup failed for temporary customer ${insertedCustomer.id}: ${deleteError.message}`,
  );
}

console.log("Cleanup: ok");
