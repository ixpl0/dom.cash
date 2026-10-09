import type { z } from 'zod'
import type { pushDeviceSchema, pushEndpointBodySchema, TODO_DIGEST_OVERDUE_MODES, TODO_DIGEST_UNDATED_MODES, todoDigestSettingsSchema } from '~~/shared/schemas/push'

export type TodoDigestOverdueMode = typeof TODO_DIGEST_OVERDUE_MODES[number]

export type TodoDigestUndatedMode = typeof TODO_DIGEST_UNDATED_MODES[number]

export type TodoDigestSettings = z.infer<typeof todoDigestSettingsSchema>

export type PushDevicePayload = z.input<typeof pushDeviceSchema>

export type PushDevice = z.infer<typeof pushDeviceSchema>

export type PushEndpointPayload = z.infer<typeof pushEndpointBodySchema>

export interface PushSettingsData {
  publicKey: string | null
  settings: TodoDigestSettings
}

export interface PushTestResult {
  deliveredCount: number
}

export type PushActionName = 'complete' | 'postpone'

export interface PushMessageTodo {
  id: string
  plannedDate: string | null
}

export interface PushMessage {
  title: string
  body: string
  tag: string
  url: string
  isSilent: boolean
  todo: PushMessageTodo | null
  actions: Array<{ action: PushActionName, title: string }>
}
