import { Resend } from 'resend';

const resend = new Resend('re_Cd1VeomT_NURKKFQ8Q1gz4saBBS7Ko2aT');

export const emails = {
  sendProjectInvitation: async ({
    to,
    projectId,
    role,
    username,
    projectName,
    invitedByUsername,
  }: {
    to: string;
    projectId: string;
    role: Role;
    username: string;
    projectName: string;
    invitedByUsername: string;
  }) => {
    const response = await fetch('/api/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        projectId,
        role,
        username,
        projectName,
        invitedByUsername,
      }),
    });

    if (!response.ok) { 
      throw new Error('Failed to send invitation email');
    }

    return response.json();
  },
};
