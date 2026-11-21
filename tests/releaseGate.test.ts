import {test, expect} from 'bun:test';
import {assertReleaseReady} from '../scripts/check-release.mjs';
const sha = 'a'.repeat(40);
const fixture = () => ({sha, main:sha, protection:{
 enforce_admins:{enabled:true}, required_status_checks:{strict:true,checks:[{context:'quality',app_id:15368}]},
 required_pull_request_reviews:{required_approving_review_count:0}, allow_force_pushes:{enabled:false}, allow_deletions:{enabled:false},
}, runs:[{head_sha:sha,head_branch:'main',event:'push',path:'.github/workflows/quality.yml',status:'completed',conclusion:'success',html_url:'fixture'}]});
test('release preflight accepts a protected current main with successful main quality', () => {
 expect(assertReleaseReady(fixture()).sha).toBe(sha);
});
test('release preflight rejects stale revisions, weak protection and pending/failed/skipped quality', () => {
 const edits = [
  f=>f.main='b'.repeat(40), f=>f.protection.enforce_admins.enabled=false,
  f=>f.protection.required_status_checks.strict=false, f=>f.protection.required_status_checks.checks[0].app_id=1,
  f=>f.protection.required_pull_request_reviews=null,
  f=>f.protection.required_pull_request_reviews.bypass_pull_request_allowances={apps:['lovable']},
  f=>f.protection.allow_force_pushes.enabled=true, f=>f.protection.allow_deletions.enabled=true,
  f=>f.runs[0].status='in_progress', f=>f.runs[0].conclusion='failure', f=>f.runs[0].conclusion='skipped',
  f=>f.runs[0].event='pull_request', f=>f.runs[0].head_sha='b'.repeat(40), f=>f.runs=[],
 ];
 for (const edit of edits) {const f=fixture();edit(f);expect(()=>assertReleaseReady(f)).toThrow();}
});
