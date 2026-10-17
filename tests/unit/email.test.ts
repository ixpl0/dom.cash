import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { sendVerificationEmail } from '../../server/utils/email'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { createRequestEvent } from './helpers/request-event'

const RECIPIENT = 'user@example.com'
const SEND_ERROR = { statusCode: 500, message: ERROR_KEYS.FAILED_TO_SEND_EMAIL }

const answerAsResend = (context: TestContext, answer: () => Promise<Response>) => {
  const previousApiKey = process.env.RESEND_API_KEY
  process.env.RESEND_API_KEY = 'test-resend-key'
  context.after(() => {
    if (previousApiKey === undefined) {
      delete process.env.RESEND_API_KEY
    }
    else {
      process.env.RESEND_API_KEY = previousApiKey
    }
  })
  context.mock.method(globalThis, 'fetch', answer)
  return context.mock.method(console, 'error', () => {})
}

const sendCode = () => sendVerificationEmail({
  event: createRequestEvent('POST', '/api/auth/send-code'),
  to: RECIPIENT,
  code: '123456',
  template: 'verification',
})

test('a refused email logs the status and the error name of Resend, not its message with the address', async (context) => {
  const errorLog = answerAsResend(context, async () => Response.json(
    { statusCode: 429, name: 'daily_quota_exceeded', message: `The daily quota is used up, ${RECIPIENT} gets nothing` },
    { status: 429 },
  ))

  await assert.rejects(sendCode(), SEND_ERROR)
  assert.deepEqual(errorLog.mock.calls.map(call => call.arguments), [
    ['Resend API error:', { status: 429, name: 'daily_quota_exceeded' }],
  ])
})

test('a refused email without a JSON answer logs only the status', async (context) => {
  const errorLog = answerAsResend(context, async () => new Response('Bad gateway', { status: 502 }))

  await assert.rejects(sendCode(), SEND_ERROR)
  assert.deepEqual(errorLog.mock.calls.map(call => call.arguments), [
    ['Resend API error:', { status: 502, name: null }],
  ])
})

test('an email that does not reach Resend is logged once', async (context) => {
  const errorLog = answerAsResend(context, async () => {
    throw new TypeError('fetch failed')
  })

  await assert.rejects(sendCode(), SEND_ERROR)
  assert.deepEqual(errorLog.mock.calls.map(call => call.arguments[0]), ['Resend request failed:'])
})
