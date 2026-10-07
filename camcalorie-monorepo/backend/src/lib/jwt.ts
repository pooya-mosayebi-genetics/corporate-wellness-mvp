import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env';

export interface AccessPayload {
  sub: string;
  role: string;
  typ: 'access';
}

export interface RefreshPayload {
  sub: string;
  typ: 'refresh';
  jti: string;
}

export interface FlowPayload {
  sub: string;
  typ: 'flow';
  step: 'password' | 'setup';
  bootstrap: boolean;
}

export const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function signAccess(nationalId: string, role: string): string {
  return jwt.sign({ sub: nationalId, role, typ: 'access' }, env.JWT_SECRET, { expiresIn: '15m' });
}

export function signRefresh(nationalId: string): string {
  return jwt.sign({ sub: nationalId, typ: 'refresh', jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
}

export function signFlow(nationalId: string, step: 'password' | 'setup', bootstrap: boolean): string {
  return jwt.sign({ sub: nationalId, typ: 'flow', step, bootstrap }, env.JWT_SECRET, { expiresIn: '5m' });
}

export function verifyAccess(token: string): AccessPayload | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as any;
    return p?.typ === 'access' ? (p as AccessPayload) : null;
  } catch {
    return null;
  }
}

export function verifyRefresh(token: string): RefreshPayload | null {
  try {
    const p = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
    return p?.typ === 'refresh' ? (p as RefreshPayload) : null;
  } catch {
    return null;
  }
}

export function verifyFlow(token: string): FlowPayload | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as any;
    return p?.typ === 'flow' ? (p as FlowPayload) : null;
  } catch {
    return null;
  }
}