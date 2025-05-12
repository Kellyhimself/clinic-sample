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
      from: 'onboarding@resend.dev',
      to,
      subject: `You've been invited to join ${tenantName}`,
      html: `
        <div>
          <h1>Welcome to ${tenantName}!</h1>
          <p>You've been invited by ${invitedBy} to join as a ${role}.</p>
          <p>Click the link below to accept the invitation and set up your account:</p>
          <a href="${invitationLink}">Accept Invitation</a>
          <p>This invitation will expire in 7 days.</p>
        </div>
      `
    });

    if (error) {
      console.error('Failed to send invitation email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending invitation email:', error);
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
      from: 'onboarding@resend.dev',
      to,
      subject: `Welcome to ${tenantName}!`,
      html: `
        <div>
          <h1>Welcome to ${tenantName}, ${fullName}!</h1>
          <p>Your account has been successfully created.</p>
          <p>You can now log in and start using the platform.</p>
        </div>
      `
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
} 