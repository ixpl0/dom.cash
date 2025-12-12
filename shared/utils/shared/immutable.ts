export const toMutable = <T>(data: T): T => JSON.parse(JSON.stringify(data))
