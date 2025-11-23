import { createClient } from "@libsql/client/web";

const url = (import.meta as any).env.VITE_TURSO_DATABASE_URL;
const authToken = (import.meta as any).env.VITE_TURSO_AUTH_TOKEN;

if (!url) {
  console.error("VITE_TURSO_DATABASE_URL não definida.");
}

export const turso = createClient({
  url: url || "",
  authToken: authToken || "",
});