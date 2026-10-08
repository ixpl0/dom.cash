import type { PushOptions, PushResult, PushTarget } from '~~/server/utils/web-push'

export interface RecordedPush {
  endpoint: string
  message: unknown
  options: PushOptions
}

const MAX_RECORDED_PUSHES = 200

let recordedPushes: readonly RecordedPush[] = []

export const recordTestPush = async ({ endpoint }: PushTarget, message: unknown, options: PushOptions): Promise<PushResult> => {
  recordedPushes = [...recordedPushes, { endpoint, message, options }].slice(-MAX_RECORDED_PUSHES)
  return { status: 201, isDelivered: true, isGone: false }
}

export const readTestPushes = (endpoint: string): RecordedPush[] =>
  recordedPushes.filter(recordedPush => recordedPush.endpoint === endpoint)
