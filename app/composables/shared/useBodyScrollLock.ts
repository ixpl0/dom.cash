import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'

let lockOwners: ReadonlyArray<symbol> = []
let overflowBeforeLock = ''

const acquireLock = (owner: symbol): void => {
  if (lockOwners.includes(owner)) {
    return
  }

  if (lockOwners.length === 0) {
    overflowBeforeLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  lockOwners = lockOwners.concat(owner)
}

const releaseLock = (owner: symbol): void => {
  if (!lockOwners.includes(owner)) {
    return
  }

  lockOwners = lockOwners.filter(lockOwner => lockOwner !== owner)

  if (lockOwners.length === 0) {
    document.body.style.overflow = overflowBeforeLock
  }
}

export const useBodyScrollLock = (isLocked: MaybeRefOrGetter<boolean>): void => {
  if (import.meta.server) {
    return
  }

  const owner = Symbol('body-scroll-lock')

  watch(() => toValue(isLocked), (shouldLock) => {
    if (shouldLock) {
      acquireLock(owner)
    }
    else {
      releaseLock(owner)
    }
  }, { immediate: true })

  onScopeDispose(() => {
    releaseLock(owner)
  })
}
