import { handleCors, errorResponse } from "../_shared/cors.ts";

// Retired: chat retention now runs inside the database (cleanup_expired_chat_messages via pg_cron).
// This public endpoint performs no work so it can never delete data on an unauthenticated request.
Deno.serve((req) => handleCors(req) ?? errorResponse("Gone", 410));
