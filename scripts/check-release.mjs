import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

// Read-only preflight for manual Lovable publication; it does not control its Publish button.
export function assertReleaseReady({sha, main, protection, runs}) {
  assert.match(sha, /^[a-f0-9]{40}$/);
  assert.equal(main, sha, 'Release must be the current main revision');
  assert.equal(protection.enforce_admins?.enabled, true, 'Admins must also pass checks');
  assert.equal(protection.required_status_checks?.strict, true, 'Require an up-to-date branch');
  assert(protection.required_status_checks?.checks?.some(c => c.context === 'quality' && c.app_id === 15368), 'Require quality from GitHub Actions');
  assert(protection.required_pull_request_reviews, 'Changes must go through a PR');
  assert(Object.values(protection.required_pull_request_reviews.bypass_pull_request_allowances || {}).every(list => list.length === 0), 'No PR bypass');
  assert.equal(protection.allow_force_pushes?.enabled, false);
  assert.equal(protection.allow_deletions?.enabled, false);
  const run = runs.find(r => r.head_sha === sha && r.head_branch === 'main' && r.event === 'push' && r.path === '.github/workflows/quality.yml');
  assert(run, 'No main quality run for this revision');
  assert.equal(run.status, 'completed', 'Wait for main quality checks');
  assert.equal(run.conclusion, 'success', 'Main quality must pass before publishing');
  return {sha, quality: run.html_url, publication: 'manual; verify Lovable is synced to this main revision'};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = 'repos/onronder/ai-royale-coach';
  const get = path => JSON.parse(execFileSync('gh', ['api', `${repo}/${path}`], {encoding:'utf8'}));
  const sha = process.argv[2];
  assert.match(sha || '', /^[a-f0-9]{40}$/, 'Usage: node scripts/check-release.mjs <full-main-sha>');
  const protection = get('branches/main/protection');
  const {workflow_runs: runs} = get(`actions/workflows/quality.yml/runs?head_sha=${sha}&event=push&per_page=100`);
  const main = get('git/ref/heads/main').object.sha;
  console.log(JSON.stringify(assertReleaseReady({sha, main, protection, runs}), null, 2));
}
