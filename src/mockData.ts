import { SmtpServer, LeadItem } from './types';
import { analyzeLead } from './utils/leadHygiene';

export const INITIAL_SMTPS: SmtpServer[] = [
  {
    id: 'smtp-1',
    name: 'AWS SES Production Relay',
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    username: 'AKIAIOSFODNN7EXAMPLE',
    security: 'STARTTLS',
    fromEmail: 'outreach@enterprisecloud.io',
    fromName: 'Enterprise Growth Team',
    replyTo: 'replies@enterprisecloud.io',
    hourlyLimit: 500,
    dailyQuota: 5000,
    sentToday: 142,
    sentThisHour: 24,
    status: 'verified',
    lastPingMs: 38,
    priority: 1,
  },
  {
    id: 'smtp-2',
    name: 'SendGrid High-Volume Tier',
    host: 'smtp.sendgrid.net',
    port: 465,
    username: 'apikey_live_0942x',
    security: 'SSL/TLS',
    fromEmail: 'director@enterprisecloud.io',
    fromName: 'Direct Outreach',
    replyTo: 'director@enterprisecloud.io',
    hourlyLimit: 1200,
    dailyQuota: 10000,
    sentToday: 520,
    sentThisHour: 45,
    status: 'verified',
    lastPingMs: 44,
    priority: 2,
  },
  {
    id: 'smtp-3',
    name: 'Postmark Transactional Pool',
    host: 'smtp.postmarkapp.com',
    port: 587,
    username: 'pm-token-live-8924b1093',
    security: 'STARTTLS',
    fromEmail: 'executive@enterprisecloud.io',
    fromName: 'Executive Relations',
    replyTo: 'executive@enterprisecloud.io',
    hourlyLimit: 300,
    dailyQuota: 2500,
    sentToday: 60,
    sentThisHour: 8,
    status: 'verified',
    lastPingMs: 29,
    priority: 3,
  },
];

const RAW_INITIAL_LEADS: Array<{ email: string; name?: string; company?: string }> = [
  // 1. Legitimate Clean B2B Leads (including info@ and sales@ per user instructions)
  { email: 'alex.turner@cloudscale.io', name: 'Alex Turner', company: 'CloudScale Technologies' },
  { email: 'sarah.lin@apexrobotics.de', name: 'Sarah Lin', company: 'Apex Robotics GmbH' },
  { email: 'info@quantumsoftware.eu', name: 'Quantum Operations', company: 'Quantum Software' },
  { email: 'sales@nexustechnology.co', name: 'Sales Division', company: 'Nexus Technology' },
  { email: 'marcus.vance@solarisinfra.com', name: 'Marcus Vance', company: 'Solaris Infrastructure' },
  { email: 'elena.rostova@cyberdefense.ch', name: 'Elena Rostova', company: 'CyberDefense AG' },
  { email: 'david.kim@hyperlogic.io', name: 'David Kim', company: 'HyperLogic Systems' },

  // 2. Public Webmail (Gmail, Yahoo, Hotmail, etc.)
  { email: 'johnny_business99@gmail.com', name: 'John Peterson', company: 'Personal Gmail' },
  { email: 'mark.smith1984@yahoo.com', name: 'Mark Smith', company: 'Yahoo User' },
  { email: 'sarah.consultant@hotmail.com', name: 'Sarah Miller', company: 'Personal Hotmail' },
  { email: 'kevin.techie@outlook.com', name: 'Kevin Brown', company: 'Outlook Free' },

  // 3. Bank & Financial Institutions
  { email: 'richard.coleman@chase.com', name: 'Richard Coleman', company: 'JPMorgan Chase & Co' },
  { email: 'alicia.vance@bankofamerica.com', name: 'Alicia Vance', company: 'Bank of America Corp' },
  { email: 'corporate.desk@wellsfargo.com', name: 'Commercial Desk', company: 'Wells Fargo Bank' },
  { email: 'trader.floor@goldmansachs.com', name: 'Trading Floor', company: 'Goldman Sachs' },

  // 4. Government & Military
  { email: 'investigations@fbi.gov', name: 'Field Office', company: 'Federal Bureau of Investigation' },
  { email: 'procurement@defense.gov', name: 'Procurement Dept', company: 'Department of Defense' },
  { email: 'trade.policy@treasury.gov.uk', name: 'Trade Advisory', company: 'HM Treasury UK' },

  // 5. Education & Universities
  { email: 'dean.admissions@mit.edu', name: 'Dean Office', company: 'MIT University' },
  { email: 'research.fellow@oxford.ac.uk', name: 'Research Lab', company: 'Oxford University' },
  { email: 'admin.records@stanford.edu', name: 'Registrar', company: 'Stanford University' },

  // 6. Generic System Usernames (webmaster, privacy, policy, user, admin, abuse, postmaster)
  { email: 'webmaster@acmeworks.com', name: 'Web Master', company: 'Acme Works' },
  { email: 'privacy@novalabs.tech', name: 'Privacy Compliance', company: 'Nova Labs' },
  { email: 'policy@cybersecshield.org', name: 'Policy Officer', company: 'CyberSec Shield' },
  { email: 'user@platformservices.net', name: 'Test User', company: 'Platform Services' },
  { email: 'admin@globalventures.org', name: 'System Administrator', company: 'Global Ventures' },
  { email: 'abuse@cloudhostingservers.net', name: 'Abuse Desk', company: 'Cloud Hosting' },
  { email: 'postmaster@datarouting.net', name: 'Postmaster Service', company: 'Data Routing Corp' },

  // 7. Dead Domains, No MX & Syntax Errors
  { email: 'robert.faulty@@invalid-format.com', name: 'Broken Email', company: 'Invalid Syntax' },
  { email: 'contact@expired-domain-dns.net', name: 'Expired Company', company: 'Expired MX Domain' },
  { email: 'tester@nonexistent-domain-404.xyz', name: 'Dead Host', company: 'Dead Host' },
  { email: 'temp_user_88@mailinator.com', name: 'Disposable Burner', company: 'Mailinator' },
];

export const INITIAL_LEADS: LeadItem[] = RAW_INITIAL_LEADS.map(item =>
  analyzeLead(item.email, item.name, item.company)
);

export const SAMPLE_COMPOSE_HTML = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0; text-align: left;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">Enterprise B2B Architecture Update</h1>
    <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Confidential Executive Briefing</p>
  </div>
  <div style="background: #ffffff; padding: 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0; font-size: 15px;">Hello {{first_name | 'Executive'}},</p>
    <p style="font-size: 14px; color: #334155;">
      We are reaching out regarding infrastructure optimization at <strong>{{company | 'your organization'}}</strong>. Our high-throughput dispatch cluster has been upgraded with automated MX validation and RFC 8058 deliverability compliance.
    </p>
    <div style="margin: 24px 0; padding: 16px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #0f172a; font-weight: 600;">Key Technical Highlights:</p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #475569;">
        <li>Sequential one-by-one transmission with custom throttle delays</li>
        <li>Automated B2B lead scrubbing (removes public webmail, banking, edu/gov, generic roles)</li>
        <li>Full CC, BCC, and custom Reply-To header injection</li>
      </ul>
    </div>
    <p style="font-size: 14px; color: #334155;">
      Would you be available for a brief 10-minute technical review this week?
    </p>
    <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">Best regards,<br/><strong>Infrastructure Operations</strong><br/>Enterprise Cloud Systems</p>
      <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
        Sent to {{email}}. If you wish to manage your email preferences, <a href="{{unsubscribe_url}}" style="color: #0284c7; text-decoration: underline;">click here to opt out</a>.
      </p>
    </div>
  </div>
</div>`;

export const SAMPLE_COMPOSE_TEXT = `Hello {{first_name | 'Colleague'}},

We are reaching out regarding infrastructure optimization at {{company | 'your organization'}}. 

Our high-throughput dispatch cluster has been upgraded with automated MX validation and RFC 8058 deliverability compliance.

Key Technical Highlights:
- Sequential one-by-one transmission with custom throttle delays
- Automated B2B lead scrubbing (removes public webmail, banking, edu/gov, generic roles)
- Full CC, BCC, and custom Reply-To header injection

Would you be available for a brief 10-minute technical review this week?

Best regards,
Infrastructure Operations
Enterprise Cloud Systems

--
Sent to {{email}}. To unsubscribe: {{unsubscribe_url}}`;
