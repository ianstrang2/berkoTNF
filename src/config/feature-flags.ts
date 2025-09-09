/**
 * Feature flags configuration for background job system
 * Allows toggling between background jobs and direct edge function calls
 */

interface BackgroundJobFeatureFlags {
  USE_BG_JOBS_ADMIN: boolean;
  USE_BG_JOBS_CRON: boolean;
  USE_BG_JOBS_MATCH: boolean;
  USE_BG_JOBS: boolean; // Master switch - if false, all others are ignored
}

// Environment variable based feature flags with sensible defaults
export const BACKGROUND_JOB_FLAGS: BackgroundJobFeatureFlags = {
  USE_BG_JOBS: process.env.NEXT_PUBLIC_USE_BG_JOBS === 'true',
  USE_BG_JOBS_ADMIN: process.env.NEXT_PUBLIC_USE_BG_JOBS_ADMIN === 'true',
  USE_BG_JOBS_CRON: process.env.NEXT_PUBLIC_USE_BG_JOBS_CRON === 'true',
  USE_BG_JOBS_MATCH: process.env.NEXT_PUBLIC_USE_BG_JOBS_MATCH === 'true',
};

/**
 * Check if background jobs should be used for a specific trigger type
 */
export function shouldUseBackgroundJobs(triggerType: 'admin' | 'cron' | 'match'): boolean {
  // Debug logging
  console.log('ENV VARS', {
    NEXT_PUBLIC_USE_BG_JOBS: process.env.NEXT_PUBLIC_USE_BG_JOBS,
    NEXT_PUBLIC_USE_BG_JOBS_ADMIN: process.env.NEXT_PUBLIC_USE_BG_JOBS_ADMIN,
    NEXT_PUBLIC_USE_BG_JOBS_MATCH: process.env.NEXT_PUBLIC_USE_BG_JOBS_MATCH,
    NEXT_PUBLIC_USE_BG_JOBS_CRON: process.env.NEXT_PUBLIC_USE_BG_JOBS_CRON,
  });

  // Master switch check first
  if (!BACKGROUND_JOB_FLAGS.USE_BG_JOBS) {
    return false;
  }

  switch (triggerType) {
    case 'admin':
      return BACKGROUND_JOB_FLAGS.USE_BG_JOBS_ADMIN;
    case 'cron':
      return BACKGROUND_JOB_FLAGS.USE_BG_JOBS_CRON;
    case 'match':
      return BACKGROUND_JOB_FLAGS.USE_BG_JOBS_MATCH;
    default:
      return false;
  }
}

/**
 * Get current feature flag status for debugging/admin display
 */
export function getFeatureFlagStatus(): BackgroundJobFeatureFlags & { 
  effective: {
    admin: boolean;
    cron: boolean;
    match: boolean;
  }
} {
  return {
    ...BACKGROUND_JOB_FLAGS,
    effective: {
      admin: shouldUseBackgroundJobs('admin'),
      cron: shouldUseBackgroundJobs('cron'),
      match: shouldUseBackgroundJobs('match'),
    }
  };
}

/**
 * Log current feature flag configuration (for startup/debugging)
 */
export function logFeatureFlagStatus(): void {
  const status = getFeatureFlagStatus();
  
  console.log('🎛️  Background Job Feature Flags:');
  console.log(`   Global: ${status.USE_BG_JOBS ? '✅' : '❌'}`);
  console.log(`   Admin:  ${status.effective.admin ? '✅' : '❌'} (env: ${status.USE_BG_JOBS_ADMIN})`);
  console.log(`   Cron:   ${status.effective.cron ? '✅' : '❌'} (env: ${status.USE_BG_JOBS_CRON})`);
  console.log(`   Match:  ${status.effective.match ? '✅' : '❌'} (env: ${status.USE_BG_JOBS_MATCH})`);
}