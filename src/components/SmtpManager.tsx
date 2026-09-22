import React, { useState, useEffect, useRef } from 'react';
import { SmtpServer } from '../types';
import { parseBulkSmtpInput, testSmtpConnection } from '../utils/smtpEngine';
import { 
  Server, 
  Plus, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Shield, 
  Sliders, 
  Clock, 
  Zap,
  Lock,
  ArrowUpDown,
  RotateCw,
  Sparkles,
  Activity,
  Check,
  Radio,
  SlidersHorizontal,
  Flame,
  Edit2
} from 'lucide-react';

interface SmtpManagerProps {
  servers: SmtpServer[];
  onUpdateServers: (servers: SmtpServer[]) => void;
}

export const SmtpManager: React.FC<SmtpManagerProps> = ({ servers, onUpdateServers }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add_single' | 'bulk_loader'>('list');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  
  // Continuous Auto-Health Testing Toggle
  const [autoHealthTestEnabled, setAutoHealthTestEnabled] = useState(true);
  const [autoTestIntervalSec, setAutoTestIntervalSec] = useState(30);
  const [lastAuditTimestamp, setLastAuditTimestamp] = useState<string>('Just now');
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Single SMTP form state
  const [singleForm, setSingleForm] = useState<Partial<SmtpServer>>({
    name: 'Primary Outbound Relay',
    host: 'smtp.office365.com',
    port: 587,
    username: 'ops@company.com',
    password: '',
    security: 'STARTTLS',
    fromEmail: 'ops@company.com',
    fromName: 'Operations Lead',
    hourlyLimit: 1000,
    dailyQuota: 10000,
    priority: servers.length + 1,
  });

  // Bulk input state
  const [bulkInput, setBulkInput] = useState<string>(
`# Bulk SMTP Loader format: host:port:username:password[:security][:fromEmail]
smtp-relay.gmail.com:587:dispatch@corp.net:app-token-x92:STARTTLS:dispatch@corp.net
smtp.sendgrid.net:465:apikey:SG.live-mock-token-1829:SSL/TLS:updates@corp.net
smtp.office365.com:587:connect@enterprise.com:m365-pass-token:STARTTLS:connect@enterprise.com`
  );
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  // Auto-fill SMTP configuration from username/email domain
  const handleAutoConfigureFromEmail = (inputEmailOrUser: string) => {
    const trimmed = inputEmailOrUser.trim();
    if (!trimmed.includes('@')) return;
    const domain = trimmed.split('@')[1]?.toLowerCase().trim();
    if (!domain) return;

    let suggestedHost = '';
    let suggestedPort = 587;
    let suggestedSecurity: 'STARTTLS' | 'SSL/TLS' | 'NONE' = 'STARTTLS';

    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      suggestedHost = 'smtp.gmail.com';
      suggestedPort = 465;
      suggestedSecurity = 'SSL/TLS';
    } else if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || domain === 'office365.com') {
      suggestedHost = 'smtp.office365.com';
      suggestedPort = 587;
      suggestedSecurity = 'STARTTLS';
    } else if (domain === 'yahoo.com' || domain === 'ymail.com') {
      suggestedHost = 'smtp.mail.yahoo.com';
      suggestedPort = 465;
      suggestedSecurity = 'SSL/TLS';
    } else if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
      suggestedHost = 'smtp.mail.me.com';
      suggestedPort = 587;
      suggestedSecurity = 'STARTTLS';
    } else if (domain === 'zoho.com') {
      suggestedHost = 'smtppro.zoho.com';
      suggestedPort = 465;
      suggestedSecurity = 'SSL/TLS';
    } else if (domain === 'mail.com') {
      suggestedHost = 'smtp.mail.com';
      suggestedPort = 587;
      suggestedSecurity = 'STARTTLS';
    } else if (domain === 'gmx.com' || domain === 'gmx.net') {
      suggestedHost = 'mail.gmx.com';
      suggestedPort = 587;
      suggestedSecurity = 'STARTTLS';
    } else if (domain.includes('sendgrid')) {
      suggestedHost = 'smtp.sendgrid.net';
      suggestedPort = 587;
      suggestedSecurity = 'STARTTLS';
    } else if (domain.includes('mailgun')) {
      suggestedHost = 'smtp.mailgun.org';
      suggestedPort = 587;
      suggestedSecurity = 'STARTTLS';
    } else if (domain.includes('postmark')) {
      suggestedHost = 'smtp.postmarkapp.com';
      suggestedPort = 587;
      suggestedSecurity = 'STARTTLS';
    } else {
      // Standard corporate mail server convention
      suggestedHost = `mail.${domain}`;
      suggestedPort = 587;
      suggestedSecurity = 'STARTTLS';
    }

    setSingleForm(prev => ({
      ...prev,
      username: trimmed,
      fromEmail: prev.fromEmail && prev.fromEmail !== 'ops@company.com' ? prev.fromEmail : trimmed,
      host: suggestedHost,
      port: suggestedPort,
      security: suggestedSecurity,
      name: prev.name && prev.name !== 'Primary Outbound Relay' ? prev.name : `${domain.split('.')[0].toUpperCase()} Relay`,
    }));
  };

  // Test credentials before adding to list
  const [isPreTesting, setIsPreTesting] = useState(false);
  const [preTestResult, setPreTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  const handlePreTestConnection = async () => {
    if (!singleForm.host || !singleForm.username) {
      setPreTestResult({ success: false, message: 'Please enter SMTP host and username before testing.' });
      return;
    }

    setIsPreTesting(true);
    setPreTestResult(null);

    const testServer: SmtpServer = {
      id: 'pre-test',
      name: singleForm.name || 'Test Relay',
      host: singleForm.host,
      port: Number(singleForm.port) || 587,
      username: singleForm.username,
      password: singleForm.password || '',
      security: singleForm.security || 'STARTTLS',
      fromEmail: singleForm.fromEmail || singleForm.username,
      fromName: singleForm.fromName || 'Outbound Mailer',
      hourlyLimit: 1000,
      dailyQuota: 10000,
      sentToday: 0,
      sentThisHour: 0,
      status: 'active',
      priority: 1,
    };

    try {
      const res = await testSmtpConnection(testServer);
      setPreTestResult(res);
    } catch (err: any) {
      setPreTestResult({ success: false, message: err.message || 'Connection failed' });
    } finally {
      setIsPreTesting(false);
    }
  };

  // Test single server
  const handleTestServer = async (server: SmtpServer) => {
    setTestingId(server.id);
    const result = await testSmtpConnection(server);

    const updated = servers.map(s => {
      if (s.id === server.id) {
        return {
          ...s,
          status: result.success ? ('verified' as const) : ('failed' as const),
          lastPingMs: result.latencyMs,
          errorMessage: result.success ? undefined : result.message,
        };
      }
      return s;
    });

    onUpdateServers(updated);
    setTestingId(null);
    showFeedback(
      result.success 
        ? `✓ Relay ${server.name} handshake passed (${result.latencyMs}ms)` 
        : `✗ Relay ${server.name} failed: ${result.message}`
    );
  };

  // Test all servers in rotational pool
  const handleTestAll = async () => {
    if (servers.length === 0) return;
    setIsTestingAll(true);
    showFeedback('Testing all relay connections concurrently...');

    const updated = await Promise.all(
      servers.map(async (server) => {
        const result = await testSmtpConnection(server);
        return {
          ...server,
          status: result.success ? ('verified' as const) : ('failed' as const),
          lastPingMs: result.latencyMs,
          errorMessage: result.success ? undefined : result.message,
        };
      })
    );

    onUpdateServers(updated);
    setIsTestingAll(false);
    setLastAuditTimestamp(new Date().toLocaleTimeString());
    const passCount = updated.filter(s => s.status === 'verified').length;
    showFeedback(`Relay cluster audit complete: ${passCount} of ${updated.length} servers verified operational.`);
  };

  // Delete all non-working servers (Explicit User Requirement)
  const handleDeleteNonWorking = () => {
    const failedServers = servers.filter(s => s.status === 'failed');
    if (failedServers.length === 0) {
      showFeedback('No non-working servers detected in pool.');
      return;
    }

    const workingOnly = servers.filter(s => s.status !== 'failed');
    const removedCount = failedServers.length;
    onUpdateServers(workingOnly);
    showFeedback(`Successfully purged ${removedCount} non-working SMTP relays from pool.`);
  };

  // Automatic periodic health test interval
  useEffect(() => {
    if (!autoHealthTestEnabled || servers.length === 0) return;

    const intervalId = setInterval(async () => {
      const updated = await Promise.all(
        servers.map(async (server) => {
          const result = await testSmtpConnection(server);
          return {
            ...server,
            status: result.success ? ('verified' as const) : ('failed' as const),
            lastPingMs: result.latencyMs,
            errorMessage: result.success ? undefined : result.message,
          };
        })
      );
      onUpdateServers(updated);
      setLastAuditTimestamp(new Date().toLocaleTimeString());
    }, autoTestIntervalSec * 1000);

    return () => clearInterval(intervalId);
  }, [autoHealthTestEnabled, autoTestIntervalSec, servers.length]);

  // Editing state for an existing server
  const [editingServerId, setEditingServerId] = useState<string | null>(null);

  const handleStartEditServer = (server: SmtpServer) => {
    setEditingServerId(server.id);
    setSingleForm({
      name: server.name,
      host: server.host,
      port: server.port,
      security: server.security,
      username: server.username,
      password: server.password,
      fromEmail: server.fromEmail,
      fromName: server.fromName,
      hourlyLimit: server.hourlyLimit,
      dailyQuota: server.dailyQuota,
      priority: server.priority,
    });
    setPreTestResult(null);
    setActiveTab('add_single');
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.host || !singleForm.username) return;

    if (editingServerId) {
      const updated = servers.map(s => {
        if (s.id === editingServerId) {
          return {
            ...s,
            name: singleForm.name || s.name,
            host: singleForm.host || s.host,
            port: Number(singleForm.port) || s.port,
            username: singleForm.username || s.username,
            password: singleForm.password !== undefined ? singleForm.password : s.password,
            security: singleForm.security || s.security,
            fromEmail: singleForm.fromEmail || s.fromEmail,
            fromName: singleForm.fromName || s.fromName,
            hourlyLimit: Number(singleForm.hourlyLimit) || s.hourlyLimit,
            dailyQuota: Number(singleForm.dailyQuota) || s.dailyQuota,
            status: 'active' as const,
          };
        }
        return s;
      });
      onUpdateServers(updated);
      setEditingServerId(null);
      setActiveTab('list');
      showFeedback(`Updated relay ${singleForm.name} configuration.`);
      return;
    }

    const newServer: SmtpServer = {
      id: `smtp-${Date.now()}`,
      name: singleForm.name || 'New Enterprise Relay',
      host: singleForm.host,
      port: Number(singleForm.port) || 587,
      username: singleForm.username,
      password: singleForm.password || '',
      security: singleForm.security || 'STARTTLS',
      fromEmail: singleForm.fromEmail || singleForm.username,
      fromName: singleForm.fromName || 'Outbound Mailer',
      hourlyLimit: Number(singleForm.hourlyLimit) || 1000,
      dailyQuota: Number(singleForm.dailyQuota) || 10000,
      sentToday: 0,
      sentThisHour: 0,
      status: 'active',
      priority: Number(singleForm.priority) || servers.length + 1,
    };

    onUpdateServers([...servers, newServer]);
    setActiveTab('list');
    showFeedback(`Added ${newServer.name} to rotational pool.`);
  };

  const handleProcessBulk = () => {
    const { valid, errors } = parseBulkSmtpInput(bulkInput);
    setBulkErrors(errors);
    if (valid.length > 0) {
      onUpdateServers([...servers, ...valid]);
      setActiveTab('list');
      showFeedback(`Imported ${valid.length} relays into rotational pool.`);
    }
  };

  const handleDeleteServer = (id: string) => {
    onUpdateServers(servers.filter(s => s.id !== id));
  };

  const workingRelays = servers.filter(s => s.status === 'verified' || s.status === 'active');
  const failedRelays = servers.filter(s => s.status === 'failed');

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden text-neutral-100">
      {/* Top Banner & Relay Health Telemetry */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Server className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Rotational Outbound Accounts &amp; Automated Health Monitor
            </h2>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-mono font-bold">
              ROUND-ROBIN POOL
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Continuously tests SMTP relay connections, isolates unresponsive servers, and distributes sequential delivery loads rotationally across live nodes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Test All Servers */}
          <button
            onClick={handleTestAll}
            disabled={isTestingAll || servers.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isTestingAll ? 'animate-spin' : ''}`} />
            <span>{isTestingAll ? 'Auditing Cluster...' : 'Test All Relays'}</span>
          </button>

          {/* Delete Non-Working Servers Button (Explicitly Requested) */}
          <button
            onClick={handleDeleteNonWorking}
            disabled={failedRelays.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-lg text-xs font-bold disabled:opacity-30 transition-colors"
            title="Purge all servers that failed connection or authentication tests"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete Non-Working Relays ({failedRelays.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add_single')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-neutral-950 rounded-lg text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Single SMTP</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk_loader')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-800 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bulk Import</span>
          </button>
        </div>
      </div>

      {/* Auto-Health Test Control & Feedback Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 shrink-0 flex items-center justify-between flex-wrap gap-2 text-xs shadow-md">
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoHealthTestEnabled}
              onChange={(e) => setAutoHealthTestEnabled(e.target.checked)}
              className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span className="text-neutral-200 font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Automatic Relay Health Probing:</span>
            </span>
          </label>

          <select
            value={autoTestIntervalSec}
            onChange={(e) => setAutoTestIntervalSec(Number(e.target.value))}
            className="bg-neutral-950 border border-neutral-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value={15}>Every 15s</option>
            <option value={30}>Every 30s</option>
            <option value={60}>Every 1 min</option>
            <option value={300}>Every 5 min</option>
          </select>

          <span className="text-neutral-400 text-[11px]">
            Last Probe: <strong className="text-emerald-400 font-mono">{lastAuditTimestamp}</strong>
          </span>
        </div>

        {feedback && (
          <div className="text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-lg font-medium flex items-center space-x-1.5 animate-in fade-in">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <span className="text-emerald-400 font-bold">{workingRelays.length} Operational</span>
          <span className="text-neutral-700">/</span>
          <span className={`${failedRelays.length > 0 ? 'text-rose-400 font-bold' : 'text-neutral-500'}`}>
            {failedRelays.length} Failing
          </span>
        </div>
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col min-h-0 shadow-lg shadow-black/40">
        {activeTab === 'list' && (
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-neutral-950 sticky top-0 z-10 text-neutral-400 font-bold border-b border-neutral-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Relay Host &amp; Name</th>
                  <th className="py-3 px-3">Port &amp; TLS</th>
                  <th className="py-3 px-3">Authorized Identity</th>
                  <th className="py-3 px-3">Health Status</th>
                  <th className="py-3 px-3">Latency</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
                {servers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-500">
                      No SMTP servers configured. Add an outbound relay or bulk import credentials above.
                    </td>
                  </tr>
                ) : (
                  servers.map(server => (
                    <tr key={server.id} className="hover:bg-neutral-800/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white flex items-center space-x-1.5">
                          <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{server.name}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{server.host}</div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className="text-neutral-200">Port {server.port}</span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-neutral-950 text-emerald-400 text-[10px] border border-neutral-800 font-bold">
                          {server.security}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-mono text-white truncate max-w-[180px] font-medium">{server.fromEmail}</div>
                        <div className="text-[10px] text-neutral-400 truncate max-w-[180px]">{server.username}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        {server.status === 'verified' || server.status === 'active' ? (
                          <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            <span>Operational</span>
                          </div>
                        ) : server.status === 'failed' ? (
                          <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
                            <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                            <span>Failed Handshake</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-neutral-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                            <span>{server.status}</span>
                          </div>
                        )}
                        {server.errorMessage && (
                          <div className="text-[10px] text-rose-400 truncate max-w-[200px] mt-0.5 font-mono" title={server.errorMessage}>
                            {server.errorMessage}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-400">
                        {server.lastPingMs ? `${server.lastPingMs}ms` : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleStartEditServer(server)}
                            className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-emerald-400 rounded-lg text-xs transition-colors border border-neutral-800"
                            title="Edit server configuration"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleTestServer(server)}
                            disabled={testingId === server.id}
                            className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs transition-colors border border-neutral-800"
                            title="Test connection accuracy"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${testingId === server.id ? 'animate-spin text-emerald-400' : ''}`} />
                          </button>

                          <button
                            onClick={() => handleDeleteServer(server.id)}
                            className="p-1.5 bg-neutral-950 hover:bg-rose-950/80 text-neutral-400 hover:text-rose-400 rounded-lg text-xs transition-colors border border-neutral-800 hover:border-rose-900"
                            title="Delete server from pool"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Single SMTP Tab */}
        {activeTab === 'add_single' && (
          <form onSubmit={handleAddSingle} className="p-6 overflow-y-auto space-y-4 max-w-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-sm">
                {editingServerId ? 'Edit SMTP Relay Configuration' : 'Add New SMTP Relay'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingServerId(null);
                  setActiveTab('list');
                }}
                className="text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <label className="block text-emerald-400 font-bold mb-1">
                  1. SMTP Username or Email Address:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={singleForm.username || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSingleForm(prev => ({ ...prev, username: val }));
                      handleAutoConfigureFromEmail(val);
                    }}
                    placeholder="e.g. interoceamnarine11@gmail.com or ops@enterprise.com"
                    className="flex-1 bg-neutral-900 border border-neutral-700 focus:border-emerald-500 rounded-lg p-2.5 text-white focus:outline-none font-mono text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleAutoConfigureFromEmail(singleForm.username || '')}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 rounded-lg text-xs font-semibold whitespace-nowrap border border-neutral-700"
                  >
                    Auto-Detect Server
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Typing your email automatically generates the optimal SMTP Server host, port, and TLS setting. You can edit any parameter below.
                </p>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Friendly Label / Name:</label>
                <input
                  type="text"
                  value={singleForm.name || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                  placeholder="e.g. Primary Dedicated Relay"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  SMTP Host (Auto-generated / Editable):
                </label>
                <input
                  type="text"
                  value={singleForm.host || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-white focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Port (Editable):</label>
                <input
                  type="number"
                  value={singleForm.port || 587}
                  onChange={(e) => setSingleForm({ ...singleForm, port: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-white focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Security / Encryption:</label>
                <select
                  value={singleForm.security || 'STARTTLS'}
                  onChange={(e) => setSingleForm({ ...singleForm, security: e.target.value as any })}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-white focus:outline-none"
                >
                  <option value="STARTTLS">STARTTLS (Port 587 recommended)</option>
                  <option value="SSL/TLS">SSL/TLS (Port 465 recommended for Gmail/Yahoo)</option>
                  <option value="NONE">None / Plain (Port 25)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  SMTP Password or App Password:
                </label>
                <input
                  type="password"
                  value={singleForm.password || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-white focus:outline-none font-mono"
                />
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  For Gmail / Google Workspace, use a 16-character Google App Password with 2FA.
                </p>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Sender Email (From):</label>
                <input
                  type="email"
                  value={singleForm.fromEmail || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, fromEmail: e.target.value })}
                  placeholder="outbound@domain.com"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-white focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Sender Display Name:</label>
                <input
                  type="text"
                  value={singleForm.fromName || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, fromName: e.target.value })}
                  placeholder="e.g. Outreach Team"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Pre-Test Result Alert */}
            {preTestResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-start space-x-2 ${
                preTestResult.success 
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' 
                  : 'bg-rose-950/80 border-rose-800 text-rose-200'
              }`}>
                {preTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold">
                    {preTestResult.success ? 'Handshake Passed & Verified!' : 'SMTP Connection Failed'}
                  </div>
                  <div className="text-[11px] mt-0.5 font-mono">{preTestResult.message}</div>
                  {preTestResult.latencyMs && (
                    <div className="text-[10px] opacity-75 mt-0.5">Latency: {preTestResult.latencyMs}ms</div>
                  )}
                  {!preTestResult.success && (
                    <div className="text-[11px] text-rose-300 mt-1">
                      You can edit the Host, Port, or Password above and test again until successful.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              {/* Test Button before adding */}
              <button
                type="button"
                onClick={handlePreTestConnection}
                disabled={isPreTesting}
                className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-neutral-200 rounded-lg border border-neutral-700 font-semibold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isPreTesting ? 'animate-spin' : ''}`} />
                <span>{isPreTesting ? 'Testing Handshake...' : 'Test SMTP Connection'}</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingServerId(null);
                    setActiveTab('list');
                  }}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg shadow-md"
                >
                  {editingServerId ? 'Save Changes' : 'Save & Add Relay'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Bulk Loader Tab */}
        {activeTab === 'bulk_loader' && (
          <div className="p-6 overflow-y-auto space-y-4 max-w-3xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="font-bold text-white text-sm">Bulk SMTP Relay Ingestion</h3>
                <p className="text-neutral-400 text-xs mt-0.5">
                  Paste multiple servers using standard delimiter format: <code>host:port:username:password[:security][:fromEmail]</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={8}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-3 text-xs font-mono text-emerald-300 placeholder-neutral-500 focus:outline-none leading-relaxed"
            />

            {bulkErrors.length > 0 && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-200 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Validation Warnings:</span>
                </div>
                {bulkErrors.map((err, i) => (
                  <div key={i} className="text-[11px] font-mono">• {err}</div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessBulk}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg shadow-md"
              >
                Parse &amp; Import Relays
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
