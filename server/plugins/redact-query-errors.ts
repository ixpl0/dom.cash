import { redactQueryErrors } from '~~/server/utils/secure-logger'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error) => {
    redactQueryErrors(error)
  })
})
