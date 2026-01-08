/**
 * Shared CORS headers and handler for all edge functions
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handle CORS preflight requests
 * @returns Response for OPTIONS requests, null otherwise
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response with CORS headers
 */
export function errorResponse(message: string, status = 500, extra?: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ error: message, ...extra }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
