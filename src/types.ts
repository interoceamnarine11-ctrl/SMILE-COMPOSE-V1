export interface SmtpServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  security: 'STARTTLS' | 'SSL/TLS' | 'NONE';
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  hourlyLimit: number;
  dailyQuota: number;
  sentToday: number;
  sentThisHour: number;
  status: 'active' | 'testing' | 'verified' | 'failed' | 'rate_limited' | 'disabled';
  lastPingMs?: number;
  errorMessage?: string;
  priority: number; // 1 = highest
}

export type MxCheckStatus = 'valid' | 'invalid_mx' | 'dead_domain' | 'no_mx' | 'syntax_error' | 'checking';

export interface LeadItem {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username: string;
  domain: string;
  company?: string;
  country?: string;
  targetLanguage?: string;
  languageCode?: string;
  phone?: string;
  address?: string;
  isEnriched?: boolean;
  mxStatus: MxCheckStatus;
  mxHost?: string;
  isPublicWebmail: boolean;
  isBankRelated: boolean;
  isGovOrEdu: boolean;
  isGenericUsername: boolean;
  isNonB2B: boolean;
  isDead: boolean;
  isCleanB2B: boolean;
  categoryTags: string[];
}

export interface ComposeDraft {
  subject: string;
  bodyType: 'html' | 'text';
  bodyHtml: string;
  bodyText: string;
  rawRecipients: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  cc: string;
  bcc: string;
  selectedSmtpId: string;
  delaySeconds: number;
}

export interface DispatchLogItem {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  smtpServerName: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  status: 'sent' | 'failed' | 'in_progress';
  message: string;
  timestamp: string;
  latencyMs?: number;
}

export type DispatchPacingMode = 'continuous' | 'hourly_batches' | 'minute_batches' | 'round_the_clock';

export interface DispatchPacingSettings {
  mode: DispatchPacingMode;
  delayPerEmailSec: number;
  batchSize: number; // e.g. 50 leads per hour/minute
  batchIntervalMinutes: number; // e.g. 60 min for hourly, 1 min for minute
  loopRotational: boolean; // Continuous loop over SMTP relays and recipients
  maxDailyCap: number;
  requireMxVerifiedOnly: boolean; // Only dispatch to leads with good MX records
}

export interface EnterpriseLicense {
  licensee: string;
  organization: string;
  licenseKey: string;
  edition: 'Enterprise Commercial Suite' | 'OEM Corporate White-Label' | 'Infinite Outbound Pro';
  validUntil: string;
  nodeId: string;
  isActivated: boolean;
}

// Backward compatibility types
export interface Recipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  industry: string;
  city: string;
  tier: 'Enterprise' | 'Pro' | 'Free' | 'Starter';
  customData?: Record<string, string>;
  status: 'active' | 'unsubscribed' | 'bounced_soft' | 'bounced_hard';
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyPlain: string;
  category: string;
  updatedAt: string;
}

export interface CampaignConfig {
  id: string;
  title: string;
  templateId: string;
  fromNameOverride?: string;
  threads: number;
  deliveryMode: 'smtp_pool' | 'direct_mx';
  throttleDelayMs: number;
  enableIpWarming: boolean;
  warmingStage: number;
  maxRetries: number;
  trackOpens: boolean;
  trackClicks: boolean;
  unsubscribeLink: boolean;
  domainThrottling: {
    gmailLimitPerSec: number;
    outlookLimitPerSec: number;
    yahooLimitPerSec: number;
    corporateLimitPerSec: number;
  };
}

export interface QueueItem {
  id: string;
  recipientEmail: string;
  recipientName: string;
  smtpServerId?: string;
  smtpServerName?: string;
  status: 'pending' | 'sending' | 'sent' | 'retrying' | 'failed' | 'bounced';
  bounceType?: 'soft' | 'hard';
  attemptCount: number;
  threadId: number;
  timestamp?: number;
  responseMsg?: string;
}

export interface CampaignMetrics {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  softBounces: number;
  hardBounces: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  speedPerSec: number;
  activeThreads: number;
  elapsedSeconds: number;
}
