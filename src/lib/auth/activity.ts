/**
 * Authentication Activity Logging
 * 
 * Logs authentication events for security monitoring and audit trails
 * Privacy-focused: hashes IP addresses and user agents
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Activity types for authentication events
 */
export type AuthActivityType =
  | 'login'
  | 'logout'
  | 'password_reset'
  | 'email_change'
  | 'phone_verification'
  | 'profile_claimed'
  | 'role_switched'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'invitation_sent'
  | 'tenant_switched';

/**
 * Parameters for logging authentication activity
 */
export interface LogAuthActivityParams {
  user_id: string;
  tenant_id?: string | null;
  activity_type: AuthActivityType;
  success: boolean;
  failure_reason?: string;
  metadata?: Record<string, any>;
  request?: NextRequest;
}

/**
 * Hash a string using SHA256 for privacy
 * 
 * @param value - String to hash
 * @returns SHA256 hash of the value
 */
function hashForPrivacy(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Extract and hash IP address from request
 * 
 * @param request - Next.js request object
 * @returns Hashed IP address or null
 */
function getHashedIP(request?: NextRequest): string | null {
  if (!request) return null;

  // Try various headers for IP address (Vercel, Cloudflare, standard)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown';

  return ip !== 'unknown' ? hashForPrivacy(ip) : null;
}

/**
 * Extract and hash user agent from request
 * 
 * @param request - Next.js request object
 * @returns Hashed user agent or null
 */
function getHashedUserAgent(request?: NextRequest): string | null {
  if (!request) return null;

  const userAgent = request.headers.get('user-agent');
  return userAgent ? hashForPrivacy(userAgent) : null;
}

/**
 * Log an authentication activity event
 * 
 * This function logs authentication events with privacy-focused hashing
 * of IP addresses and user agents. It's used throughout the auth system
 * to maintain an audit trail.
 * 
 * @param params - Activity logging parameters
 * @returns Promise that resolves when log is created
 * 
 * @example
 * ```typescript
 * await logAuthActivity({
 *   user_id: session.user.id,
 *   tenant_id: tenantId,
 *   activity_type: 'login',
 *   success: true,
 *   request: req
 * });
 * ```
 */
export async function logAuthActivity(params: LogAuthActivityParams): Promise<void> {
  const {
    user_id,
    tenant_id,
    activity_type,
    success,
    failure_reason,
    metadata,
    request,
  } = params;

  try {
    await prisma.auth_activity_log.create({
      data: {
        user_id,
        tenant_id: tenant_id || null,
        activity_type,
        success,
        failure_reason: failure_reason || null,
        ip_address_hash: getHashedIP(request),
        user_agent_hash: getHashedUserAgent(request),
        metadata: metadata || {},
      },
    });
  } catch (error) {
    // Don't throw - logging should never break the auth flow
    console.error('Failed to log auth activity:', error);
  }
}

/**
 * Log a successful authentication event
 * 
 * @param params - Activity logging parameters (success defaults to true)
 */
export async function logAuthSuccess(
  params: Omit<LogAuthActivityParams, 'success'>
): Promise<void> {
  return logAuthActivity({ ...params, success: true });
}

/**
 * Log a failed authentication event
 * 
 * @param params - Activity logging parameters (success defaults to false)
 */
export async function logAuthFailure(
  params: Omit<LogAuthActivityParams, 'success'>
): Promise<void> {
  return logAuthActivity({ ...params, success: false });
}

