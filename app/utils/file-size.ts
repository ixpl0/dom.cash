const FILE_SIZE_UNITS = ['kilobyte', 'megabyte', 'gigabyte'] as const
const BYTES_IN_KILOBYTE = 1024

export const formatFileSize = (bytes: number, locale: string): string => {
  const exponent = bytes >= BYTES_IN_KILOBYTE
    ? Math.min(FILE_SIZE_UNITS.length, Math.floor(Math.log(bytes) / Math.log(BYTES_IN_KILOBYTE)))
    : 1

  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: FILE_SIZE_UNITS[exponent - 1],
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(bytes / BYTES_IN_KILOBYTE ** exponent)
}
