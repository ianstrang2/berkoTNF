'use client';
import React from 'react';
import MarketingNav from '../marketing/components/MarketingNav.component';
import Footer from '../marketing/components/Footer.component';
import PlausibleScript from '@/components/analytics/PlausibleScript.component';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Privacy-friendly analytics for marketing page */}
      <PlausibleScript />
      
      <MarketingNav onGetApp={() => {}} />
      
      {/* Privacy Policy Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16" style={{ paddingTop: 'calc(var(--safe-top, 0px) + 80px)' }}>
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">Privacy Policy for Capo</h1>
        <p className="text-neutral-600 mb-12">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="prose prose-lg max-w-none">
          <p className="text-neutral-700 leading-relaxed mb-6">
            Capo ("we", "our", "us") provides football statistics, score tracking and related services through our mobile and web apps (together, the "Service"). This Privacy Policy explains how we collect, use, and protect your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
          </p>
          
          <p className="text-neutral-700 leading-relaxed mb-8">
            By using Capo, you agree to the practices described here.
          </p>

          {/* Section 1 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">1. Who We Are (Data Controller)</h2>
          <p className="text-neutral-700 leading-relaxed mb-2">Capo</p>
          <p className="text-neutral-700 leading-relaxed mb-2">United Kingdom</p>
          <p className="text-neutral-700 leading-relaxed mb-6">Email: hello@caposport.com</p>
          <p className="text-neutral-700 leading-relaxed mb-6">
            If we later register a company, these controller details may be updated without further notice.
          </p>

          {/* Section 2 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">2. Data We Collect</h2>
          
          <h3 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">a. Information you provide</h3>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-6 space-y-2">
            <li>Phone number (required for account creation and login)</li>
            <li>Email address (optional)</li>
            <li>Name or display name</li>
            <li>Favourite teams or preferences</li>
            <li>Admin data: for admin accounts only, we collect signup source/referrer</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-6">
            We do not collect passwords — access is phone-number–based.
          </p>

          <h3 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">b. Information collected automatically</h3>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-6 space-y-2">
            <li>Device type, operating system, browser</li>
            <li>IP address</li>
            <li>App usage statistics</li>
            <li>Server logs for security and diagnostics</li>
            <li>Authentication events (Supabase)</li>
          </ul>

          <h3 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">c. Analytics data</h3>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We use Plausible Analytics, a privacy-focused, cookie-free analytics provider.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-6">
            No cookies or cross-site tracking are used.
          </p>

          <h3 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">d. Payments</h3>
          <p className="text-neutral-700 leading-relaxed mb-2">
            Payments are handled by Stripe.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We receive information such as:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-2 space-y-2">
            <li>transaction amount</li>
            <li>transaction status</li>
            <li>payer ID (from Stripe)</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-6">
            We do not store or process card details.
          </p>

          <h3 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">e. Public profile & leaderboard data</h3>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We store stats, match results, team/league participation and similar gameplay data.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-6">
            This data may be shown publicly as part of the Service (see section 7).
          </p>

          {/* Section 3 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">3. How We Use Your Data</h2>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We process data to:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-6 space-y-2">
            <li>Provide and operate the Service</li>
            <li>Authenticate your account</li>
            <li>Track player scores, stats and match history</li>
            <li>Run leaderboards, rankings, leagues and competitions</li>
            <li>Facilitate payments between users and admins</li>
            <li>Send important service notifications</li>
            <li>Provide customer support</li>
            <li>Prevent fraud or abuse</li>
            <li>Improve and develop the platform</li>
          </ul>

          <h3 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">Legal bases under UK GDPR</h3>
          <p className="text-neutral-700 leading-relaxed mb-2">
            <strong>Contract:</strong> to provide the Service
          </p>
          <p className="text-neutral-700 leading-relaxed mb-2">
            <strong>Legitimate interests:</strong>
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-2 space-y-2">
            <li>analytics</li>
            <li>scorekeeping, leaderboards, and public display of player stats</li>
            <li>preventing abuse</li>
            <li>app performance</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-2">
            <strong>Consent:</strong>
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-6 space-y-2">
            <li>optional email updates</li>
            <li>push notifications (required by PECR)</li>
          </ul>

          {/* Section 4 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">4. Public Profiles, League Tables & Stats</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            Although Capo currently displays profiles privately, the app is designed to support public player stats, public profiles, rankings, match histories and social sharing.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-4">
            We may display user stats publicly as part of the Service.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-2">
            This is based on Legitimate Interests, because:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-4 space-y-2">
            <li>competitive ranking is core to the platform</li>
            <li>user stats have value in a sporting context</li>
            <li>public display is expected in apps of this nature</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-2">
            When public profiles are enabled:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-4 space-y-2">
            <li>users will be able to choose a display name instead of their real name</li>
            <li>users may be able to toggle visibility of some elements</li>
            <li>sensitive or personal-contact information will not be shown publicly</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-6">
            We will not require new consent to enable public profiles, as this policy provides notice in advance.
          </p>

          {/* Section 5 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">5. Push Notifications</h2>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We may send push notifications for:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-4 space-y-2">
            <li>match results</li>
            <li>score updates</li>
            <li>invitations</li>
            <li>feature or service messages</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-2">
            Push notifications require opt-in consent on your device.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-6">
            You can turn them off at any time.
          </p>

          {/* Section 6 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">6. Payments via Stripe</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            If you pay for matches or services, your payment is handled by Stripe, who acts as an independent data controller for payment information.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We receive no card details.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We may receive:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-6 space-y-2">
            <li>anonymised payer token</li>
            <li>payment success/failure</li>
            <li>the amount paid</li>
            <li>the associated admin account</li>
          </ul>

          {/* Section 7 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">7. Third-Party Providers</h2>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We use the following services to run Capo:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-4 space-y-2">
            <li>Vercel – hosting and deployment</li>
            <li>Supabase – authentication, database, storage</li>
            <li>Render – backend hosting</li>
            <li>Resend – transactional email (passwordless login emails, support emails)</li>
            <li>Plausible – privacy-friendly analytics</li>
            <li>Stripe – payments</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-4">
            These providers may process data in the UK, EU, or US.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-6">
            Where data is transferred outside the UK, we rely on approved safeguards such as SCCs or the UK IDTA.
          </p>

          {/* Section 8 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">8. Data Retention</h2>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We retain data only as long as necessary for the purposes described.
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-6 space-y-2">
            <li>Account data: kept while your account is active</li>
            <li>Match history and gameplay data: kept indefinitely (see below)</li>
            <li>Analytics logs: typically 12–36 months</li>
            <li>Payment records: 6 years (required by law)</li>
          </ul>

          <h3 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">Gameplay Data & Right to Erasure</h3>
          <p className="text-neutral-700 leading-relaxed mb-2">
            Because deleting a player's data would break league tables, historical stats and competitive integrity:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-4 space-y-2">
            <li>We may anonymise your profile instead of deleting match results entirely</li>
            <li>Your contributions to matches, scores and rankings may be retained in anonymised form</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-6">
            This is permitted under UK GDPR where erasure would "seriously impair" the service or conflict with legitimate interests.
          </p>

          {/* Section 9 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">9. Your Rights</h2>
          <p className="text-neutral-700 leading-relaxed mb-2">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-4 space-y-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion (with the anonymisation exception above)</li>
            <li>Object to processing based on legitimate interests</li>
            <li>Port your data</li>
            <li>Withdraw consent (e.g. email or push notifications)</li>
            <li>Lodge a complaint with the ICO (ico.org.uk)</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-6">
            To exercise your rights, email: hello@caposport.com
          </p>

          {/* Section 10 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">10. Children</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            Capo is intended for adults.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-6">
            We do not knowingly collect data from users under 18.
          </p>

          {/* Section 11 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">11. Cookies</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            Capo uses no cookies for analytics or tracking.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-4">
            Plausible Analytics is fully cookie-free.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-6">
            If additional features later require cookies, we will update this policy and (if required) provide a consent banner.
          </p>

          {/* Section 12 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">12. Security</h2>
          <p className="text-neutral-700 leading-relaxed mb-2">
            We take reasonable technical and organisational measures to protect your data, including:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 leading-relaxed mb-4 space-y-2">
            <li>encrypted connections</li>
            <li>secure hosting environments</li>
            <li>access controls</li>
            <li>audit logs</li>
            <li>isolation between databases</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mb-6">
            However, no system is 100% secure.
          </p>

          {/* Section 13 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">13. Changes to This Policy</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            We may update this Privacy Policy from time to time.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-4">
            The "Last updated" date at the top will be changed accordingly.
          </p>
          <p className="text-neutral-700 leading-relaxed mb-6">
            Significant changes may be announced via the app or email.
          </p>

          {/* Section 14 */}
          <h2 className="text-2xl font-bold text-neutral-900 mt-12 mb-4">14. Contact</h2>
          <p className="text-neutral-700 leading-relaxed mb-2">
            For any questions, please contact:
          </p>
          <p className="text-neutral-700 leading-relaxed mb-2">Capo</p>
          <p className="text-neutral-700 leading-relaxed mb-2">United Kingdom</p>
          <p className="text-neutral-700 leading-relaxed mb-12">Email: hello@caposport.com</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

