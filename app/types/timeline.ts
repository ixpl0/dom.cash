import type { InjectionKey } from 'vue'

export interface TimelineColumnsSync {
  registerRow: (elements: HTMLElement[]) => void
  unregisterRow: (elements: HTMLElement[]) => void
}

export const timelineColumnsSyncKey: InjectionKey<TimelineColumnsSync> = Symbol('timelineColumnsSync')
