import { SmtpServer, Recipient, QueueItem, CampaignConfig, CampaignMetrics } from '../types';
import { renderGMerge } from './gMerge';

export function parseBulkSmtpInput(rawText: string): { valid: SmtpServer[]; errors: string[] } {
  const lines = rawText.split('\n');
  const valid: SmtpServer[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // Supported formats:
    // host:port:user:pass:security:fromEmail
    // host,port,user,pass,security,fromEmail
    const delimiter = trimmed.includes('|') ? '|' : trimmed.includes(':') && trimmed.split(':').length >= 4 ? ':' : ',';
    const parts = trimmed.split(delimiter).map(p => p.trim());

    if (parts.length < 4) {
      errors.push(`Line ${index + 1}: Expected format "host:port:username:password[:security][:fromEmail]"`);
      return;
    }

    const host = parts[0];
    const port = parseInt(parts[1], 10) || 587;
    const username = parts[2];
    const password = parts[3];
    const securityRaw = (parts[4] || 'STARTTLS').toUpperCase();
    const security: 'STARTTLS' | 'SSL/TLS' | 'NONE' = 
      securityRaw.includes('SSL') ? 'SSL/TLS' : securityRaw.includes('NONE') ? 'NONE' : 'STARTTLS';
    const fromEmail = parts[5] || (username.includes('@') ? username : `sender@${host.replace(/^smtp\./, '')}`);

    const id = `smtp-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    valid.push({
      id,
      name: `${host} (${port})`,
      host,
      port,
      username,
      password,
      security,
      fromEmail,
      fromName: 'Outbound Mailer',
      hourlyLimit: 1000,
      dailyQuota: 10000,
      sentToday: 0,
      sentThisHour: 0,
      status: 'active',
      priority: valid.length + 10,
    });
  });

  return { valid, errors };
}

export async function testSmtpConnection(server: SmtpServer): Promise<{ success: boolean; latencyMs: number; message: string }> {
  // Realistic simulation of SMTP handshake and AUTH command
  const start = performance.now();
  await new Promise(res => setTimeout(res, 350 + Math.random() * 400));
  const latencyMs = Math.round(performance.now() - start);

  // Check common validation errors
  if (!server.host || server.host.trim() === '') {
    return { success: false, latencyMs, message: 'Invalid host address provided' };
  }

  if (server.port === 25 && !server.host.includes('dedicated') && !server.host.includes('postfix')) {
    // Port 25 frequently blocked by consumer ISPs
    return { 
      success: false, 
      latencyMs, 
      message: 'Connection timed out on Port 25 (Standard residential/cloud ISP egress port block). Recommend Port 587 (STARTTLS) or Port 465 (SSL).' 
    };
  }

  if (server.username.toLowerCase().includes('invalid')) {
    return { success: false, latencyMs, message: '535 5.7.8 Error: authentication failed: Invalid credentials or expired application password' };
  }

  return {
    success: true,
    latencyMs,
    message: `250-AUTH LOGIN PLAIN OK. TLS handshaked successfully using ${server.security} (${latencyMs}ms response)`
  };
}

export class SmtpPoolManager {
  private servers: SmtpServer[];
  private currentIndex: number = 0;

  constructor(servers: SmtpServer[]) {
    this.servers = JSON.parse(JSON.stringify(servers));
  }

  public getAvailableServer(): SmtpServer | null {
    // Sort by priority and find healthy server with remaining quota
    const candidates = this.servers
      .filter(s => s.status === 'verified' || s.status === 'active')
      .sort((a, b) => a.priority - b.priority);

    for (const server of candidates) {
      if (server.sentThisHour < server.hourlyLimit && server.sentToday < server.dailyQuota) {
        return server;
      } else {
        server.status = 'rate_limited';
        server.errorMessage = `Rate quota reached (${server.sentThisHour}/${server.hourlyLimit}/hr). Pool switching...`;
      }
    }

    return null;
  }

  public recordSend(serverId: string) {
    const s = this.servers.find(srv => srv.id === serverId);
    if (s) {
      s.sentThisHour += 1;
      s.sentToday += 1;
      if (s.sentThisHour >= s.hourlyLimit) {
        s.status = 'rate_limited';
        s.errorMessage = `Hourly throttle trigger hit (${s.sentThisHour}/${s.hourlyLimit})`;
      }
    }
  }

  public markServerError(serverId: string, error: string) {
    const s = this.servers.find(srv => srv.id === serverId);
    if (s) {
      s.status = 'failed';
      s.errorMessage = error;
    }
  }

  public getServers(): SmtpServer[] {
    return this.servers;
  }
}
