import { describe, it, expect } from 'bun:test'
import { readFirstValueResponse } from '../src/lib/firstValueResponse'
describe('First coaching streamed result', () => {
  it('requires an explicit successful final result, not an HTTP 200 heartbeat', async () => {
    await expect(readFirstValueResponse(new Response('{"progress":true}\n'))).rejects.toMatchObject(
      { code: 'service_unavailable' },
    )
    await expect(
      readFirstValueResponse(
        new Response('{"progress":true}\n{"status":409,"data":{"error":"uncertain"}}\n'),
      ),
    ).rejects.toMatchObject({ code: 'uncertain' })
  })
  it('reads a final result split between transport chunks', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(c) {
        for (const s of ['{"progress":true}\n{"sta', 'tus":200,"data":{"outcome":"ready"}}'])
          c.enqueue(encoder.encode(s))
        c.close()
      },
    })
    expect(await readFirstValueResponse(new Response(stream))).toEqual({ outcome: 'ready' })
  })
  it('keeps authentication failures separate', async () => {
    await expect(readFirstValueResponse(new Response('', { status: 401 }))).rejects.toMatchObject({
      code: 'unauthorized',
    })
  })
})
