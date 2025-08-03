import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const SALT_ROUNDS = 12

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateToken = (): string => {
  return randomBytes(32).toString('hex')
}

export const createJWT = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyJWT = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET)
  }
  catch {
    return null
  }
}

export const generateId = (): string => {
  return randomBytes(16).toString('hex')
}
