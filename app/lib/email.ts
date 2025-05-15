import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationEmailParams {
  to: string;
  invitationLink: string;
  tenantName: string;
  role: string;
  invitedBy: string;
}

export async function sendInvitationEmail({
  to,
  invitationLink,
  tenantName,
  role,
  invitedBy
}: SendInvitationEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@veylor360.com',
      to,
      subject: `You've been invited to join ${tenantName}`,
      reply_to: 'support@veylor360.com',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <img src="https://veylor360.com/logo.png" alt="${tenantName} Logo" style="max-width: 150px; margin-bottom: 20px;">
            <h1 style="color: #2d3748; margin-bottom: 20px;">Welcome to ${tenantName}!</h1>
            
            <p style="color: #4a5568; margin-bottom: 15px;">You've been invited by ${invitedBy} to join as a ${role}.</p>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #4a5568; margin-bottom: 15px;">To accept this invitation and set up your account, click the button below:</p>
              
              <a href="${invitationLink}" 
                 style="display: inline-block; background-color: #4299e1; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 20px;">
              This invitation will expire in 7 days. If you did not expect this invitation, 
              please ignore this email or contact your administrator.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 12px;">
                This is an automated message from ${tenantName}. For support, please contact <a href="mailto:support@veylor360.com">support@veylor360.com</a>
              </p>
            </div>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

interface SendWelcomeEmailParams {
  to: string;
  fullName: string;
  tenantName: string;
}

export async function sendWelcomeEmail({
  to,
  fullName,
  tenantName
}: SendWelcomeEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@veylor360.com',
      to,
      subject: `Welcome to ${tenantName}!`,
      reply_to: 'support@veylor360.com',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <img src="https://veylor360.com/logo.png" alt="${tenantName} Logo" style="max-width: 150px; margin-bottom: 20px;">
            <h1 style="color: #2d3748; margin-bottom: 20px;">Welcome to ${tenantName}, ${fullName}!</h1>
            
            <p style="color: #4a5568; margin-bottom: 15px;">
              Your account has been successfully created. You can now log in and start using the platform.
            </p>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #4a5568; margin-bottom: 15px;">
                If you have any questions or need assistance, please contact our support team.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 12px;">
                This is an automated message from ${tenantName}. For support, please contact <a href="mailto:support@veylor360.com">support@veylor360.com</a>
              </p>
            </div>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
} 