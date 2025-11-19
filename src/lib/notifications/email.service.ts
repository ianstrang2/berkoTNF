/**
 * Email Notification Service
 * 
 * Sends transactional emails via Resend
 * Gracefully handles missing configuration (logs and skips)
 */

import { Resend } from 'resend';

// Initialize Resend (will be null if not configured)
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send approval notification to player
 */
export async function sendPlayerApprovedEmail(params: {
  toEmail: string;
  playerName: string;
  clubName: string;
  loginUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  // Check if email is configured
  if (!resend) {
    console.log('[EMAIL] Resend not configured, skipping email to:', params.toEmail);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { toEmail, playerName, clubName, loginUrl } = params;

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: toEmail,
      subject: `Welcome to ${clubName}! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${clubName}!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${playerName},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Great news! Your request to join ${clubName} has been approved. 🎉
              </p>
              
              <div style="background: #f9fafb; border-left: 4px solid #7c3aed; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #4b5563;">
                  <strong>You can now:</strong><br>
                  • Login and view your stats<br>
                  • RSVP to upcoming matches<br>
                  • Track your performance<br>
                  • See team leaderboards
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Login to Capo
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 15px;">
                  <strong>💡 Pro tip:</strong> Download our mobile app for instant match notifications!
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                  <a href="https://play.google.com/store/apps/details?id=com.caposport.capo" style="display: inline-block; padding: 8px 16px; background: #f3f4f6; color: #374151; text-decoration: none; border-radius: 6px; font-size: 14px;">
                    📱 Android App
                  </a>
                  <a href="#" style="display: inline-block; padding: 8px 16px; background: #f3f4f6; color: #9ca3af; text-decoration: none; border-radius: 6px; font-size: 14px; opacity: 0.6;">
                    🍎 iOS (Coming Soon)
                  </a>
                </div>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                See you on the pitch!<br>
                <strong>- The ${clubName} Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">Powered by Capo - The 5-a-side football app</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[EMAIL] Failed to send approval email:', error);
      return { success: false, error: error.message };
    }

    console.log('[EMAIL] Approval email sent successfully to:', toEmail, '(ID:', data?.id, ')');
    return { success: true };

  } catch (error: any) {
    console.error('[EMAIL] Error sending approval email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send new join request notification to admin (optional)
 */
export async function sendNewJoinRequestEmail(params: {
  toEmail: string;
  adminName: string;
  clubName: string;
  playerName: string;
  playerPhone: string;
  approvalUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  // Check if email is configured
  if (!resend) {
    console.log('[EMAIL] Resend not configured, skipping admin notification');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { toEmail, adminName, clubName, playerName, playerPhone, approvalUrl } = params;

    // Mask phone for privacy (show first 3 and last 3 digits)
    const maskedPhone = playerPhone.length > 6 
      ? `${playerPhone.slice(0, 6)}****${playerPhone.slice(-3)}`
      : playerPhone;

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: toEmail,
      subject: `New Player Request - ${playerName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 22px;">New Player Request</h2>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${adminName},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                A new player wants to join ${clubName}:
              </p>
              
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 80px;"><strong>Name:</strong></td>
                    <td style="padding: 8px 0;">${playerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;"><strong>Phone:</strong></td>
                    <td style="padding: 8px 0;">${maskedPhone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;"><strong>Status:</strong></td>
                    <td style="padding: 8px 0;"><span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px;">Pending</span></td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${approvalUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Review in Admin Panel
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Approve or reject this request in your Players page.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">Powered by Capo</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[EMAIL] Failed to send admin notification:', error);
      return { success: false, error: error.message };
    }

    console.log('[EMAIL] Admin notification sent successfully (ID:', data?.id, ')');
    return { success: true };

  } catch (error: any) {
    console.error('[EMAIL] Error sending admin notification:', error);
    return { success: false, error: error.message };
  }
}

