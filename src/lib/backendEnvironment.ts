export function validateBackendEnvironment(url: string, project: string | undefined, key: string) {
  const parsed = new URL(url);
  const local = ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if ((!local && parsed.protocol !== 'https:') || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('Invalid backend URL');
  const ref = parsed.hostname.endsWith('.supabase.co') ? parsed.hostname.split('.')[0] : null;
  if (project && ref && project !== ref) throw new Error('Backend project and URL differ');
  if (!key) throw new Error('Missing backend public key');
  if (key.split('.').length === 3) {
    let payload: { ref?: string; role?: string };
    try { payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
    catch { throw new Error('Invalid backend public key'); }
    if (payload.role !== 'anon' || (ref && payload.ref !== ref)) throw new Error('Backend key belongs to another environment or role');
  }
  return parsed.origin;
}
