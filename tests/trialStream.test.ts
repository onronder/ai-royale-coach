import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { successfulChatStream } from '../supabase/functions/_shared/trial-stream';
const answer='data: {"choices":[{"delta":{"content":"Use Tesla"}}]}\n\n';
describe('successful trial chat generation',()=>{
 it('counts a complete visible answer',()=>assert.equal(successfulChatStream(answer+'data: [DONE]\n'),true));
 it('does not count an interrupted answer',()=>assert.equal(successfulChatStream(answer),false));
 it('does not count a successful HTTP response with empty output',()=>assert.equal(successfulChatStream('data: [DONE]\n'),false));
 it('does not count an in-stream error',()=>assert.equal(successfulChatStream(answer+'data: {"error":{"message":"Denied"}}\ndata: [DONE]\n'),false));
 it('does not count a refusal',()=>assert.equal(successfulChatStream(answer+'data: {"choices":[{"finish_reason":"content_filter"}]}\ndata: [DONE]\n'),false));
});