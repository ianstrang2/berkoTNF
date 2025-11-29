/**
 * ESLint Configuration: Package Standards
 * 
 * Enforces standardized package usage to prevent mixing incompatible auth libraries
 * 
 * Add this to your main .eslintrc.js:
 * 
 * module.exports = {
 *   extends: [
 *     // ... other configs
 *     './.eslintrc.package-standards.js'
 *   ]
 * };
 */

module.exports = {
  rules: {
    /**
     * Block deprecated Supabase auth helper packages
     * 
     * Why: @supabase/auth-helpers-nextjs (and related packages) are deprecated
     * and cause session persistence issues when mixed with @supabase/ssr
     * 
     * Use @supabase/ssr for ALL Supabase client creation
     */
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['**/auth-helpers-nextjs*'],
          message: '❌ DEPRECATED: Use @supabase/ssr instead. See docs/SPEC_auth.md for migration guide.'
        },
        {
          group: ['**/auth-helpers-react*'],
          message: '❌ DEPRECATED: Use @supabase/ssr instead. See docs/SPEC_auth.md for migration guide.'
        },
        {
          group: ['**/auth-helpers-remix*'],
          message: '❌ DEPRECATED: Use @supabase/ssr instead. See docs/SPEC_auth.md for migration guide.'
        },
        {
          group: ['@supabase/auth-helpers*'],
          message: '❌ DEPRECATED: All auth-helpers packages are deprecated. Use @supabase/ssr instead. See docs/SPEC_auth.md'
        }
      ]
    }],

    /**
     * Warn about direct document.cookie access
     * 
     * Why: Session cookies should only be managed by Supabase SDK
     * Manual cookie access can cause auth state inconsistencies
     */
    'no-restricted-syntax': ['warn', {
      selector: 'MemberExpression[object.name="document"][property.name="cookie"]',
      message: '⚠️ Avoid direct cookie access. Use Supabase SDK methods instead.'
    }]
  }
};

