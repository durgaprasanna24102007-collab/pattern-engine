interface CapturedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  otp: string;
  timestamp: string;
}

const emails: CapturedEmail[] = [];
const MAX_EMAILS = 50;

export function captureEmail(to: string, subject: string, body: string, otp: string): void {
  const entry: CapturedEmail = {
    id: Math.random().toString(36).slice(2),
    to,
    subject,
    body,
    otp,
    timestamp: new Date().toISOString(),
  };
  emails.unshift(entry);
  if (emails.length > MAX_EMAILS) emails.pop();
}

export function getEmails(): CapturedEmail[] {
  return emails;
}
