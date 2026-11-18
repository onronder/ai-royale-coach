import type { FirstValueResponse } from './firstValue'
export class FirstValueError extends Error {
  constructor(public code: string) {
    super(code)
  }
}
export async function readFirstValueResponse(response: Response): Promise<FirstValueResponse> {
  if (!response.ok)
    throw new FirstValueError(response.status === 401 ? 'unauthorized' : 'service_unavailable')
  const reader = response.body?.getReader()
  if (!reader) throw new FirstValueError('service_unavailable')
  const decoder = new TextDecoder()
  let buffer = '',
    result: { status: number; data: FirstValueResponse } | undefined
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        const item = JSON.parse(line)
        if (typeof item.status === 'number') result = item
      }
    }
    if (buffer.trim()) {
      const item = JSON.parse(buffer)
      if (typeof item.status === 'number') result = item
    }
  } finally {
    reader.releaseLock()
  }
  if (!result) throw new FirstValueError('service_unavailable')
  if (result.status >= 400) throw new FirstValueError(result.data.error || 'service_unavailable')
  return result.data
}
