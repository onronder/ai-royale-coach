// Generate the owner-run pg_cron command from this deployment's public frontend config.
const projectUrl = new URL(process.env.VITE_SUPABASE_URL);
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const host = /^([a-z0-9]+)\.supabase\.co$/.exec(projectUrl.hostname);
if (!host || projectUrl.origin !== 'https://' + projectUrl.hostname || projectUrl.href !== projectUrl.origin + '/') {
  throw new Error('Expected the HTTPS project URL from the web app.');
}
if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(key)) throw new Error('Expected the public anon JWT used by the web app.');
const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
if (claims.role !== 'anon' || claims.ref !== host[1]) throw new Error('Expected the public anon JWT for this project.');
console.log(`SELECT cron.schedule('trial-coaching-day-two', '*/10 * * * *',
  format('SELECT public.queue_trial_coaching_reminders(%L,%L)', '${projectUrl.origin}', '${key}'));`);
