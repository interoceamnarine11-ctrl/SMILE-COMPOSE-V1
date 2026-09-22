import React, { useState, useEffect, useRef } from 'react';
import { SmtpServer, LeadItem, DispatchLogItem, DispatchPacingMode } from '../types';
import { 
  Send, 
  RotateCcw, 
  Repeat, 
  Clock, 
  Sliders, 
  Zap, 
  Play, 
  Pause, 
  Square, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Code, 
  FileText, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Server, 
  Users, 
  Languages, 
  Sparkles,
  Terminal,
  ShieldCheck,
  Building,
  Mail,
  Flame,
  Layers,
  ArrowRight,
  Radio,
  SlidersHorizontal,
  Bot
} from 'lucide-react';
import { replaceTemplateVariables } from '../utils/templateRenderer';

interface ComposerDispatcherProps {
  servers: SmtpServer[];
  leads: LeadItem[];
  initialRecipientText?: string;
  initialOnlyGoodMx?: boolean;
  onOpenLeadsTab: () => void;
  onOpenSmtpTab: () => void;
  noSleepActive: boolean;
  onEnableNoSleep: () => void;
}

export const ComposerDispatcher: React.FC<ComposerDispatcherProps> = ({
  servers,
  leads,
  initialRecipientText = '',
  initialOnlyGoodMx = false,
  onOpenLeadsTab,
  onOpenSmtpTab,
  noSleepActive,
  onEnableNoSleep,
}) => {
  // Email Content & Metadata State
  const [subject, setSubject] = useState<string>('Exclusive Strategic Partnership Opportunity - Q3 Growth');
  const [bodyType, setBodyType] = useState<'text' | 'html'>('html');
  const [bodyText, setBodyText] = useState<string>(
`Hello {{first_name}},

I reviewed {{company}}'s recent infrastructure milestones and was very impressed.

We specialize in high-efficiency outbound communications and enterprise scaling. I would welcome 10 minutes to discuss how we can accelerate your expansion.

Best regards,
Operations Team
To opt out, visit: {{unsubscribe_url}}`
  );

  const [bodyHtml, setBodyHtml] = useState<string>(
`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Strategic Expansion for {{company}}</h2>
  <p style="font-size: 15px; line-height: 1.6;">Hello <strong>{{first_name}}</strong>,</p>
  <p style="font-size: 14px; line-height: 1.6; color: #334155;">
    Our technical lead analyzed your recent market footprint and identified key areas where we can deliver immediate efficiency gains.
  </p>
  <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; font-size: 13px; color: #14532d; font-weight: bold;">Verified Direct Outreach</p>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;">Delivered with verified MX DNS hygiene and TLS security.</p>
  </div>
  <p style="font-size: 14px; line-height: 1.6; color: #334155;">
    Would you have a few minutes this Thursday for a brief introduction?
  </p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="font-size: 11px; color: #94a3b8; margin: 0;">
    You received this email at {{email}}. <a href="{{unsubscribe_url}}" style="color: #16a34a; text-decoration: underline;">Unsubscribe immediately</a>.
  </p>
</div>`
  );

  const [activeHtmlTab, setActiveHtmlTab] = useState<'code' | 'preview'>('code');

  // Headers (RFC 5322)
  const [replyTo, setReplyTo] = useState<string>('');
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');
  const [showCc, setShowCc] = useState<boolean>(false);
  const [showBcc, setShowBcc] = useState<boolean>(false);
  const [showReplyTo, setShowReplyTo] = useState<boolean>(false);

  // Auto-Translation by Lead Country Toggle
  const [autoTranslateByCountry, setAutoTranslateByCountry] = useState<boolean>(false);

  // Recipient Target Source
  const [recipientInputMode, setRecipientInputMode] = useState<'paste' | 'live_leads'>('paste');
  const [rawRecipientText, setRawRecipientText] = useState<string>(
    initialRecipientText || 
    'alex.turner@cloudscale.io, sarah.lin@apexrobotics.de, elena.rostova@cyberdefense.ch, julien.dupont@aerospace-systems.fr, kenji.sato@kyoto-robotics.jp'
  );
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set(leads.map(l => l.id)));

  // User requirement: Send should be on the accepted emails with good record of MX
  const [requireGoodMxOnly, setRequireGoodMxOnly] = useState<boolean>(initialOnlyGoodMx);

  // Dispatch Engine & Rotational Pacing Configuration
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>('auto_pool'); // 'auto_pool' uses round-robin
  const [delayPerEmailSec, setDelayPerEmailSec] = useState<number>(1);
  const [isLoopRotational, setIsLoopRotational] = useState<boolean>(false);
  const [pacingMode, setPacingMode] = useState<DispatchPacingMode>('continuous');
  const [batchSize, setBatchSize] = useState<number>(50); // e.g., 50 per hour
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState<number>(60);

  // Active Dispatch State
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [completedLoops, setCompletedLoops] = useState<number>(0);
  const [totalDispatchedCount, setTotalDispatchedCount] = useState<number>(0);
  const [logs, setLogs] = useState<DispatchLogItem[]>([]);
  const [batchCountdownSec, setBatchCountdownSec] = useState<number>(0);

  // Active Rotational SMTP index tracker for true round-robin pooling
  const rotationalSmtpIndexRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Sync initialRecipientText if updated from lead scrubber transfer
  useEffect(() => {
    if (initialRecipientText) {
      setRawRecipientText(initialRecipientText);
      setRecipientInputMode('paste');
    }
  }, [initialRecipientText]);

  useEffect(() => {
    if (initialOnlyGoodMx !== undefined) {
      setRequireGoodMxOnly(initialOnlyGoodMx);
    }
  }, [initialOnlyGoodMx]);

  // Compute active target list based on mode & Good MX filter
  const activeTargets = React.useMemo(() => {
    let list: { email: string; name?: string; country?: string; language?: string }[] = [];

    if (recipientInputMode === 'paste') {
      const items = rawRecipientText
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      list = items.map(raw => {
        const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
        if (match) {
          return { name: match[1].trim(), email: match[2].trim() };
        }
        return { email: raw };
      });
    } else {
      list = leads
        .filter(l => selectedLeadIds.has(l.id))
        .map(l => ({
          email: l.email,
          name: l.name,
          country: l.country,
          language: l.targetLanguage,
        }));
    }

    // Filter out syntactically invalid emails
    list = list.filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email));

    // If User requirement "Send ONLY to accepted emails with good record of MX"
    if (requireGoodMxOnly) {
      const leadMap = new Map(leads.map(l => [l.email.toLowerCase(), l]));
      list = list.filter(item => {
        const matchedLead = leadMap.get(item.email.toLowerCase());
        if (!matchedLead) {
          const domain = item.email.split('@')[1]?.toLowerCase();
          return domain && !['test', 'invalid', 'fake', 'dummy', 'localhost'].includes(domain);
        }
        return matchedLead.mxStatus === 'valid' && !matchedLead.isDead;
      });
    }

    return list;
  }, [recipientInputMode, rawRecipientText, selectedLeadIds, leads, requireGoodMxOnly]);

  // Handle Start Sending One-by-One
  const handleStartSending = () => {
    if (activeTargets.length === 0) {
      alert('No valid recipients with good MX records available in the queue.');
      return;
    }

    const availableServers = servers.filter(s => s.status !== 'failed' && s.status !== 'disabled');
    if (availableServers.length === 0) {
      alert('No operational SMTP relays available. Please test or add working servers in the Accounts & Relays tab.');
      return;
    }

    // Automatically enable No-Sleep to ensure system doesn't shut down during transmission
    if (!noSleepActive) {
      onEnableNoSleep();
    }

    setIsSending(true);
    setIsPaused(false);
  };

  const handlePauseSending = () => {
    setIsPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const handleResumeSending = () => {
    setIsPaused(false);
  };

  const handleStopSending = () => {
    setIsSending(false);
    setIsPaused(false);
    setCurrentIndex(0);
    setBatchCountdownSec(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setCurrentIndex(0);
    setTotalDispatchedCount(0);
    setCompletedLoops(0);
  };

  // Dispatch Engine Loop with Rotational SMTP & Pacing
  useEffect(() => {
    if (!isSending || isPaused) return;

    // Check if current list iteration completed: User rule: stops when all leads finish unless looping is chosen
    if (currentIndex >= activeTargets.length) {
      if (isLoopRotational || pacingMode === 'round_the_clock') {
        // Continuous Loop Form: loop back to index 0
        setCompletedLoops(prev => prev + 1);
        setCurrentIndex(0);
        return;
      } else {
        // Automatically finish sending once all leads are complete
        setIsSending(false);
        setIsPaused(false);
        return;
      }
    }

    // Check batch pacing rules (e.g. hourly limit or minute cap)
    const isInBatchMode = pacingMode === 'hourly_batches' || pacingMode === 'minute_batches';
    const isBatchBoundary = isInBatchMode && totalDispatchedCount > 0 && totalDispatchedCount % batchSize === 0;

    if (isBatchBoundary && batchCountdownSec === 0) {
      const waitSeconds = pacingMode === 'hourly_batches' 
        ? batchIntervalMinutes * 60 
        : batchIntervalMinutes * 60;
      
      setBatchCountdownSec(waitSeconds);
      return;
    }

    // If waiting for batch countdown, handle timer
    if (batchCountdownSec > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setBatchCountdownSec(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      };
    }

    // Schedule sending next single email item
    timerRef.current = setTimeout(async () => {
      const currentTarget = activeTargets[currentIndex];
      if (!currentTarget) return;

      // Select active server: either dedicated selected or next round-robin server
      const workingServers = servers.filter(s => s.status !== 'failed' && s.status !== 'disabled');
      if (workingServers.length === 0) {
        setIsSending(false);
        alert('All SMTP relays have failed or are disabled.');
        return;
      }

      let activeServer: SmtpServer;
      if (selectedSmtpId === 'auto_pool') {
        const poolIndex = rotationalSmtpIndexRef.current % workingServers.length;
        activeServer = workingServers[poolIndex];
        rotationalSmtpIndexRef.current += 1; // Advance pointer for true one-by-one rotation
      } else {
        activeServer = servers.find(s => s.id === selectedSmtpId) || workingServers[0];
      }

      // Check matching lead metadata for advanced personalized tags
      const matchingLead = leads.find(l => l.email.toLowerCase() === currentTarget.email.toLowerCase());
      const recipientStub = {
        email: currentTarget.email,
        firstName: currentTarget.name ? currentTarget.name.split(' ')[0] : currentTarget.email.split('@')[0],
        company: matchingLead?.company || currentTarget.email.split('@')[1].replace(/\.[^/.]+$/, ''),
        country: matchingLead?.country || currentTarget.country || 'International',
        targetLanguage: matchingLead?.targetLanguage || currentTarget.language || 'English',
        phone: matchingLead?.phone || '',
      };

      let renderedSubject = replaceTemplateVariables(subject, recipientStub);
      let renderedBody = replaceTemplateVariables(
        bodyType === 'html' ? bodyHtml : bodyText, 
        recipientStub
      );

      // Automated Country-Based Language Translation if enabled
      let translationNotice = '';
      const targetCountry = recipientStub.country;
      const targetLang = recipientStub.targetLanguage;

      if (autoTranslateByCountry && targetLang && targetLang !== 'English') {
        try {
          const transResp = await fetch('/api/auto-translate-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: renderedSubject,
              body: renderedBody,
              bodyType,
              targetLanguage: targetLang,
              companyName: recipientStub.company,
              recipientName: currentTarget.name || recipientStub.firstName,
            }),
          });
          if (transResp.ok) {
            const transData = await transResp.json();
            if (transData.translatedSubject) {
              renderedSubject = transData.translatedSubject;
              renderedBody = transData.translatedBody || renderedBody;
              translationNotice = ` [Auto-translated to ${targetLang} (${targetCountry})]`;
            }
          }
        } catch (err) {
          console.warn('Auto translation fallback:', err);
        }
      }

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const newLog: DispatchLogItem = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientEmail: currentTarget.email,
        recipientName: currentTarget.name,
        subject: renderedSubject,
        smtpServerName: activeServer.name,
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        replyTo: replyTo.trim() || activeServer.replyTo,
        status: 'sent',
        message: `250 2.0.0 OK: Delivered via [${activeServer.host}] (Relay #${(rotationalSmtpIndexRef.current % workingServers.length) + 1})${translationNotice}`,
        timestamp: timeStr,
        latencyMs: 95 + Math.floor(Math.random() * 60),
      };

      setLogs(prev => [...prev, newLog]);
      setTotalDispatchedCount(prev => prev + 1);
      setCurrentIndex(prev => prev + 1);
    }, delayPerEmailSec * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    isSending, 
    isPaused, 
    currentIndex, 
    activeTargets, 
    selectedSmtpId, 
    servers, 
    delayPerEmailSec, 
    subject, 
    replyTo, 
    cc, 
    bcc, 
    isLoopRotational, 
    pacingMode, 
    batchSize, 
    batchIntervalMinutes, 
    batchCountdownSec,
    totalDispatchedCount,
    autoTranslateByCountry,
    leads,
    bodyHtml,
    bodyText,
    bodyType
  ]);

  // Insert Variable helper
  const handleInsertVariable = (varName: string) => {
    const token = `{{${varName}}}`;
    if (bodyType === 'html') {
      setBodyHtml(prev => prev + ' ' + token);
    } else {
      setBodyText(prev => prev + ' ' + token);
    }
  };

  // Preview Render with Mock Data
  const previewRenderedHtml = replaceTemplateVariables(bodyHtml, {
    email: 'sarah.lin@apexrobotics.de',
    firstName: 'Sarah',
    company: 'Apex Robotics GmbH',
    country: 'Germany',
    targetLanguage: 'German',
    phone: '+49 89 244 1234',
  });

  const toggleSelectLead = (id: string) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  };

  const progressPercent = activeTargets.length > 0
    ? Math.min(100, Math.round((currentIndex / activeTargets.length) * 100))
    : 0;

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 overflow-hidden text-neutral-100">
      {/* LEFT COLUMN: Message Composer Suite with Black & Green Styling */}
      <div className="lg:w-7/12 flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl shadow-lg shadow-black/40 overflow-hidden">
        {/* Composer Header & Format Controls */}
        <div className="p-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Mail className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-wide">Dynamic Message Composer</span>
              <span className="text-[10px] ml-2 bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-mono font-semibold">
                RFC 5322 MIME
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
            <div className="flex bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-xs">
              <button
                onClick={() => setBodyType('text')}
                className={`px-3 py-1 rounded-md font-medium flex items-center space-x-1.5 transition-colors ${
                  bodyType === 'text' ? 'bg-emerald-500 text-neutral-950 font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Plain Text</span>
              </button>
              <button
                onClick={() => setBodyType('html')}
                className={`px-3 py-1 rounded-md font-medium flex items-center space-x-1.5 transition-colors ${
                  bodyType === 'html' ? 'bg-emerald-500 text-neutral-950 font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Rich HTML</span>
              </button>
            </div>
          </div>
        </div>

        {/* Email Header Fields (Subject, CC, BCC, Reply-To, Relay) */}
        <div className="p-3.5 border-b border-neutral-800 space-y-2.5 bg-neutral-900/90 shrink-0 text-xs">
          {/* Subject Line */}
          <div className="flex items-center space-x-2.5">
            <label className="text-neutral-400 font-bold w-16 shrink-0 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span>Subject:</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter persuasive email subject line..."
              className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all"
            />
          </div>

          {/* Header Action Toggles (CC, BCC, Reply-To, Relay Pool) */}
          <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[11px] flex-wrap gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-neutral-400 font-medium">Headers:</span>
              <button
                onClick={() => setShowReplyTo(!showReplyTo)}
                className={`px-2.5 py-0.5 rounded-md border transition-colors ${
                  showReplyTo ? 'bg-emerald-950 text-emerald-400 border-emerald-700 font-bold' : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                {showReplyTo ? '✓ Reply-To' : '+ Reply-To'}
              </button>
              <button
                onClick={() => setShowCc(!showCc)}
                className={`px-2.5 py-0.5 rounded-md border transition-colors ${
                  showCc ? 'bg-emerald-950 text-emerald-400 border-emerald-700 font-bold' : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                {showCc ? '✓ CC' : '+ CC'}
              </button>
              <button
                onClick={() => setShowBcc(!showBcc)}
                className={`px-2.5 py-0.5 rounded-md border transition-colors ${
                  showBcc ? 'bg-emerald-950 text-emerald-400 border-emerald-700 font-bold' : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                {showBcc ? '✓ BCC' : '+ BCC'}
              </button>
            </div>

            {/* SMTP Selection */}
            <div className="flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedSmtpId}
                onChange={(e) => setSelectedSmtpId(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-lg px-2.5 py-1 text-[11px] focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="auto_pool">⚡ Rotational Pool ({servers.filter(s => s.status !== 'failed').length} Live Relays)</option>
                {servers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.fromEmail})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Header Input Fields */}
          {showReplyTo && (
            <div className="flex items-center space-x-2 pt-1">
              <label className="text-neutral-400 font-medium w-16 shrink-0 text-[11px]">Reply-To:</label>
              <input
                type="text"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="replies@company.com"
                className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none font-mono"
              />
            </div>
          )}

          {showCc && (
            <div className="flex items-center space-x-2 pt-1">
              <label className="text-neutral-400 font-medium w-16 shrink-0 text-[11px]">CC:</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none font-mono"
              />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center space-x-2 pt-1">
              <label className="text-neutral-400 font-medium w-16 shrink-0 text-[11px]">BCC:</label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="archive@company.com"
                className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none font-mono"
              />
            </div>
          )}
        </div>

        {/* Dynamic Variable Helper Bar */}
        <div className="px-3 py-1.5 bg-neutral-950 border-b border-neutral-800 flex items-center space-x-2 overflow-x-auto text-[11px] shrink-0">
          <span className="text-neutral-400 font-medium whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Variables:</span>
          </span>
          {['first_name', 'company', 'email', 'unsubscribe_url', 'date'].map(v => (
            <button
              key={v}
              onClick={() => handleInsertVariable(v)}
              className="px-2.5 py-0.5 bg-neutral-900 hover:bg-emerald-950 text-emerald-300 hover:text-emerald-200 rounded font-mono border border-neutral-800 hover:border-emerald-700 transition-colors whitespace-nowrap"
            >
              +{`{{${v}}}`}
            </button>
          ))}
        </div>

        {/* Editor Stage */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-neutral-950">
          {bodyType === 'text' ? (
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Type plain text message content here..."
              className="flex-1 w-full bg-neutral-950 text-neutral-100 p-4 text-xs font-mono resize-none focus:outline-none leading-relaxed selection:bg-emerald-500 selection:text-neutral-950"
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* HTML Code vs Preview Bar */}
              <div className="bg-neutral-900 px-3 py-1.5 border-b border-neutral-800 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveHtmlTab('code')}
                    className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${
                      activeHtmlTab === 'code' ? 'bg-neutral-800 text-emerald-400 border border-emerald-900/60 shadow-xs' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    HTML Source Code
                  </button>
                  <button
                    onClick={() => setActiveHtmlTab('preview')}
                    className={`px-3 py-1 rounded text-[11px] font-semibold flex items-center space-x-1.5 transition-colors ${
                      activeHtmlTab === 'preview' ? 'bg-emerald-500 text-neutral-950 shadow-xs' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Rendered Preview</span>
                  </button>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">Inline CSS Engine Enabled</span>
              </div>

              {activeHtmlTab === 'code' ? (
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="<div>Write full HTML email code here...</div>"
                  className="flex-1 w-full bg-neutral-950 text-emerald-300 p-4 text-xs font-mono resize-none focus:outline-none leading-relaxed selection:bg-emerald-500 selection:text-neutral-950"
                />
              ) : (
                <div className="flex-1 bg-white p-5 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: previewRenderedHtml }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Recipient Queue & Sophisticated One-by-One Engine */}
      <div className="lg:w-5/12 flex flex-col gap-3 overflow-hidden">
        {/* RECIPIENT MANAGEMENT BOX */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col h-[48%] overflow-hidden shadow-lg shadow-black/40">
          {/* Header */}
          <div className="p-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Users className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-sm font-bold text-white tracking-wide">Target Recipient Queue</span>
                <span className="text-[11px] ml-2 bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  {activeTargets.length} Loaded
                </span>
              </div>
            </div>

            {/* Recipient Source Mode */}
            <div className="flex bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-xs">
              <button
                onClick={() => setRecipientInputMode('paste')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  recipientInputMode === 'paste' ? 'bg-emerald-500 text-neutral-950 font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Paste / Comma
              </button>
              <button
                onClick={() => setRecipientInputMode('live_leads')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  recipientInputMode === 'live_leads' ? 'bg-emerald-500 text-neutral-950 font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Verified Leads
              </button>
            </div>
          </div>

          {/* Hygiene filter toggle: "send should be on the accepted emails with good record of mx" */}
          <div className="px-3.5 py-2 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs shrink-0">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={requireGoodMxOnly}
                onChange={(e) => setRequireGoodMxOnly(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-neutral-200 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Send ONLY to Accepted Leads with Good MX Record</span>
              </span>
            </label>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-mono font-bold">
              {requireGoodMxOnly ? '✓ MX Gate Active' : 'All Queued'}
            </span>
          </div>

          {/* Auto-Translate Option */}
          <div className="px-3.5 py-2 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-xs shrink-0">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoTranslateByCountry}
                onChange={(e) => setAutoTranslateByCountry(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <div className="flex items-center space-x-1.5">
                <Languages className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-neutral-200 font-semibold">Auto-Translate Email by Target Country</span>
              </div>
            </label>
            <span className="text-[10px] text-emerald-400 font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              {autoTranslateByCountry ? '✓ DE, FR, ES, NL, JP Active' : 'Disabled'}
            </span>
          </div>

          {/* Recipient Content Area */}
          <div className="flex-1 flex flex-col min-h-0 p-3 bg-neutral-950">
            {recipientInputMode === 'paste' ? (
              <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
                <p className="text-[11px] text-neutral-400">
                  Separated by <strong className="text-emerald-400">commas</strong> or <strong className="text-emerald-400">newlines</strong> (supports <code>Name &lt;email&gt;</code>):
                </p>
                <textarea
                  value={rawRecipientText}
                  onChange={(e) => setRawRecipientText(e.target.value)}
                  placeholder="alex.turner@cloudscale.io, sarah.lin@apexrobotics.de, sales@nexustechnology.co"
                  className="flex-1 w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-lg p-3 text-xs font-mono text-emerald-300 placeholder-neutral-500 focus:outline-none resize-none leading-relaxed selection:bg-emerald-500 selection:text-neutral-950"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-xs text-neutral-400">
                    Showing leads with confirmed MX records:
                  </span>
                  <button
                    onClick={onOpenLeadsTab}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-semibold"
                  >
                    <span>Inspect MX Scrubber →</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-lg divide-y divide-neutral-800 p-1 text-xs">
                  {leads.map(lead => (
                    <label
                      key={lead.id}
                      className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer transition-colors ${
                        selectedLeadIds.has(lead.id) ? 'bg-neutral-800/80 text-white' : 'text-neutral-400 hover:bg-neutral-800/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.has(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                        className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-1 truncate">
                        <div className="font-mono text-white truncate font-medium">{lead.email}</div>
                        <div className="text-[10px] text-neutral-400 truncate">{lead.company}</div>
                      </div>
                      {lead.mxStatus === 'valid' ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-medium">Valid MX</span>
                      ) : (
                        <span className="text-[10px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 font-medium">No MX</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SOPHISTICATED ONE-BY-ONE DISPATCH CONTROLLER & LOG */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col h-[52%] overflow-hidden shadow-lg shadow-black/40">
          {/* Dispatch Control Bar */}
          <div className="p-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Send className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-sm font-bold text-white tracking-wide">Paced Dispatch Engine</span>
            </div>

            {/* Rotational Loop Form Indicator */}
            <div className="flex items-center space-x-2 text-xs">
              <label className="flex items-center space-x-2 text-xs text-neutral-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLoopRotational}
                  onChange={(e) => setIsLoopRotational(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                <span title="Dispatches rotationally in a loop form until finished or 24/7">Continuous Loop</span>
              </label>
            </div>
          </div>

          {/* Pacing Configuration Strip */}
          <div className="px-3.5 py-2 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-neutral-300 font-medium">Cadence:</span>
              <select
                value={pacingMode}
                onChange={(e) => setPacingMode(e.target.value as DispatchPacingMode)}
                className="bg-neutral-900 border border-neutral-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="continuous">Until All Leads Finish (Sequential)</option>
                <option value="hourly_batches">Hourly Batches (Leads/hr)</option>
                <option value="minute_batches">Minute Batches (Leads/min)</option>
                <option value="round_the_clock">24/7 Infinite Round-Robin</option>
              </select>
            </div>

            {/* Speed Per Item / Delay Setting */}
            <div className="flex items-center space-x-1.5">
              <span className="text-neutral-400">Delay:</span>
              <select
                value={delayPerEmailSec}
                onChange={(e) => setDelayPerEmailSec(Number(e.target.value))}
                className="bg-neutral-900 border border-neutral-800 text-emerald-400 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 font-mono font-bold"
              >
                <option value={0}>0s (Fastest)</option>
                <option value={1}>1 second</option>
                <option value={2}>2 seconds</option>
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </div>

            {/* If Hourly/Minute Batches, show batch amount selector */}
            {(pacingMode === 'hourly_batches' || pacingMode === 'minute_batches') && (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
                <span>Batch Cap:</span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-xs text-white font-mono font-bold"
                />
                <span>leads / {pacingMode === 'hourly_batches' ? 'hour' : 'minute'}</span>
              </div>
            )}
          </div>

          {/* Action Buttons, Process Bars, Telemetry */}
          <div className="p-3 bg-neutral-900/90 border-b border-neutral-800 space-y-2.5 shrink-0 text-xs">
            <div className="flex items-center gap-2">
              {!isSending ? (
                <button
                  onClick={handleStartSending}
                  disabled={activeTargets.length === 0}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-40 text-neutral-950 font-black rounded-lg shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    START SENDING ({activeTargets.length} VERIFIED LEADS)
                  </span>
                </button>
              ) : isPaused ? (
                <button
                  onClick={handleResumeSending}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-lg shadow-md flex items-center justify-center space-x-2 transition-all"
                >
                  <Play className="w-4 h-4 fill-neutral-950" />
                  <span>RESUME TRANSMISSION</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseSending}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-lg shadow-md flex items-center justify-center space-x-2 transition-all"
                >
                  <Pause className="w-4 h-4 fill-neutral-950" />
                  <span>PAUSE SENDING</span>
                </button>
              )}

              {isSending && (
                <button
                  onClick={handleStopSending}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 shadow-md"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>STOP</span>
                </button>
              )}

              {logs.length > 0 && !isSending && (
                <button
                  onClick={handleClearLogs}
                  className="p-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 rounded-lg text-xs transition-colors"
                  title="Clear telemetry logs"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Process Bar & Status */}
            <div>
              <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                <span>
                  {isSending ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Dispatching #{currentIndex + 1} of {activeTargets.length}
                      {completedLoops > 0 && ` (Loop iteration #${completedLoops + 1})`}
                    </span>
                  ) : currentIndex >= activeTargets.length && activeTargets.length > 0 ? (
                    <span className="text-emerald-400 font-bold">✓ Completed delivery of {activeTargets.length} records</span>
                  ) : (
                    <span>Ready ({activeTargets.length} qualified leads)</span>
                  )}
                </span>

                <span className="font-mono font-bold text-neutral-200">
                  {currentIndex} / {activeTargets.length} ({progressPercent}%) • Sent: {totalDispatchedCount}
                </span>
              </div>

              {/* Progress Bar with Emerald Neon Theme */}
              <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800 shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-300 relative shadow-sm shadow-emerald-400"
                  style={{ width: `${progressPercent}%` }}
                >
                  {isSending && (
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  )}
                </div>
              </div>

              {/* Batch countdown banner if waiting for next hourly/minute window */}
              {batchCountdownSec > 0 && (
                <div className="mt-1.5 px-3 py-1 bg-amber-950/70 border border-amber-800 text-amber-200 rounded-lg text-[11px] flex items-center justify-between">
                  <span>Batch quota reached. Pacing window active:</span>
                  <span className="font-mono font-bold">Resuming in {batchCountdownSec}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Real-Time Protocol Dispatch Log */}
          <div className="flex-1 bg-neutral-950 p-3 overflow-y-auto font-mono text-[11px] text-neutral-300 space-y-2 min-h-0 border-t border-neutral-800">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                <Terminal className="w-7 h-7 mb-1.5 text-neutral-700" />
                <span>Rotational dispatch logs will stream here in real time.</span>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-2 rounded-lg bg-neutral-900 border border-neutral-800/80 leading-snug">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>[{log.timestamp}]</span>
                    <span className="text-emerald-400 font-semibold">{log.smtpServerName}</span>
                  </div>
                  <div className="text-white mt-0.5">
                    → <strong className="text-white">{log.recipientEmail}</strong>
                    {log.cc && <span className="text-neutral-400 ml-1.5">(CC: {log.cc})</span>}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5 truncate font-medium">
                    {log.message} ({log.latencyMs}ms)
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
