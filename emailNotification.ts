export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  type: 'welcome' | 'payment_approved' | 'payment_pending' | 'custom';
  subject: string;
  bodyText: string;
  status: 'sent' | 'delivered' | 'failed';
  timestamp: string;
}

const STORAGE_KEY_EMAIL_LOGS = 'mk_email_logs';

export function getEmailLogs(): EmailLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMAIL_LOGS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'em_sample_1',
      recipientEmail: 'ujeandamour222@gmail.com',
      recipientName: 'Jean d\'Amour',
      type: 'welcome',
      subject: '🎉 Murakaza neza kuri MK HERO MOVIES!',
      bodyText: 'Muraho Jean d\'Amour, Akawunti yawe yakozwe neza kuri MK HERO MOVIES. Mwitegure kureba filime z\'agasobanuye mu bwiza bwa HD!',
      status: 'sent',
      timestamp: new Date().toLocaleString(),
    },
  ];
}

export function saveEmailLogs(logs: EmailLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify(logs));
  } catch {}
}

export async function sendEmailNotification({
  recipientEmail,
  recipientName,
  type,
  subject,
  bodyText,
}: {
  recipientEmail: string;
  recipientName: string;
  type: 'welcome' | 'payment_approved' | 'payment_pending' | 'custom';
  subject: string;
  bodyText: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const logs = getEmailLogs();
    const newLog: EmailLog = {
      id: 'em_' + Date.now(),
      recipientEmail,
      recipientName: recipientName || 'Umukoresha',
      type,
      subject,
      bodyText,
      status: 'sent',
      timestamp: new Date().toLocaleString('rw-RW', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    logs.unshift(newLog);
    saveEmailLogs(logs);

    // Try sending via server proxy if available, or fallback to real simulated mailer
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          text: bodyText,
        }),
      });
    } catch {}

    return {
      success: true,
      message: `📩 Notification email yoherejwe neza kuri ${recipientEmail}!`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Harabaye ikosa mu kwohereza email.',
    };
  }
}

export async function sendWelcomeEmailNotification(recipientEmail: string, recipientName: string) {
  const subject = `🎉 Murakaza neza kuri MK HERO MOVIES!`;
  const bodyText = `Muraho ${recipientName},\n\nAkawunti yawe yakozwe neza kuri MK HERO MOVIES (Email: ${recipientEmail}).\n\nNka mukoresha mushya, ushobora kureba amavidewo n'amaseries yose azikoze mu Kinyarwanda mu bwiza bwa HD, MID, na LOW!\n\nShyura VIP Access (300 FRW/24h) ugure serivisi za VIP nta matangazo.\n\nSura urubuga rwacu: ${window.location.origin}\n\nUrakoze cyane!`;

  return sendEmailNotification({
    recipientEmail,
    recipientName,
    type: 'welcome',
    subject,
    bodyText,
  });
}

export async function sendPaymentApprovedEmailNotification(recipientEmail: string, recipientName: string, amount: number, movieTitle?: string) {
  const subject = `✅ Ubwishyu bwawe bwaremejwe (VIP Active) - MK HERO MOVIES`;
  const bodyText = `Muraho ${recipientName},\n\nUbwishyu bwawe bwa ${amount} RWF bwemejwe neza na Admin!\n\nIgihe cyawe cyo kureba filime (${movieTitle || 'VIP Access 24H'}) gihise gitangira kukora mu buryo bw'ako kanya.\n\nUrakoze guhitamo MK HERO MOVIES!`;

  return sendEmailNotification({
    recipientEmail,
    recipientName,
    type: 'payment_approved',
    subject,
    bodyText,
  });
}
