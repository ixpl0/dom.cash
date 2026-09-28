import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  if (useRuntimeConfig(event).public.environment === 'test') {
    setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  }
})
