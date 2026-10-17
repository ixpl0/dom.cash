export const SITE_HOST = 'domcash.example'

export const APP_PATH_CASES = [
  { address: '/budget', path: '/budget' },
  { address: '/docs?folder=1#photos', path: '/docs?folder=1#photos' },
  {
    address: '/oauth/authorize?client_id=abc&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback',
    path: '/oauth/authorize?client_id=abc&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback',
  },
  { address: '/todo/../docs', path: '/docs' },
]

export const FOREIGN_ADDRESSES = [
  'https://evil.example',
  '//evil.example',
  '/\\evil.example',
  '\\\\evil.example',
  '/\t/evil.example',
  '/\n/evil.example',
  '/..//evil.example',
  '/./%2e%2e//evil.example',
  `//${SITE_HOST}/todo`,
  '//app.invalid/todo',
  'javascript:alert(1)',
  'budget',
  '',
]
