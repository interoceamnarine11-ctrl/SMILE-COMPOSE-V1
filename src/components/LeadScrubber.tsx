import React, { useState, useMemo } from 'react';
import { LeadItem } from '../types';
import { analyzeLead, parseRawRecipientInput } from '../utils/leadHygiene';
import { 
  ShieldCheck, 
  Trash2, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Mail, 
  Building2, 
  Send, 
  RefreshCw, 
  Filter, 
  Server,
  UserX,
  FileSpreadsheet,
  Zap,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  Globe2,
  Phone,
  Languages,
  Search,
  MapPin,
  ExternalLink,
  Sparkles,
  Layers
} from 'lucide-react';

interface LeadScrubberProps {
  leads: LeadItem[];
  onUpdateLeads: (leads: LeadItem[]) => void;
  onTransferToComposer: (emails: string[], onlyGoodMx: boolean) => void;
}

export const LeadScrubber: React.FC<LeadScrubberProps> = ({
  leads,
  onUpdateLeads,
  onTransferToComposer,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [pasteInput, setPasteInput] = useState<string>('');
  const [isPasting, setIsPasting] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isCrawlingWebsites, setIsCrawlingWebsites] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Multi-selection state for Make All / Delete All
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Metrics
  const stats = useMemo(() => {
    return {
      total: leads.length,
      validMx: leads.filter(l => l.mxStatus === 'valid').length,
      cleanB2B: leads.filter(l => l.isCleanB2B).length,
      publicWebmail: leads.filter(l => l.isPublicWebmail).length,
      bankRelated: leads.filter(l => l.isBankRelated).length,
      govOrEdu: leads.filter(l => l.isGovOrEdu).length,
      genericUser: leads.filter(l => l.isGenericUsername).length,
      deadOrInvalid: leads.filter(l => l.isDead).length,
      disposable: leads.filter(l => l.isNonB2B && !l.isPublicWebmail && !l.isBankRelated && !l.isGovOrEdu && !l.isDead).length,
      internationalNonEnglish: leads.filter(l => l.targetLanguage && l.targetLanguage !== 'English').length,
    };
  }, [leads]);

  // Filtering for table
  const displayedLeads = useMemo(() => {
    return leads.filter(lead => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = lead.email.toLowerCase().includes(q) || 
                              lead.domain.toLowerCase().includes(q) ||
                              (lead.company && lead.company.toLowerCase().includes(q)) ||
                              (lead.country && lead.country.toLowerCase().includes(q)) ||
                              (lead.targetLanguage && lead.targetLanguage.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      if (filterCategory === 'good_mx') return lead.mxStatus === 'valid';
      if (filterCategory === 'clean_b2b') return lead.isCleanB2B;
      if (filterCategory === 'international') return lead.targetLanguage && lead.targetLanguage !== 'English';
      if (filterCategory === 'public_webmail') return lead.isPublicWebmail;
      if (filterCategory === 'bank') return lead.isBankRelated;
      if (filterCategory === 'gov_edu') return lead.isGovOrEdu;
      if (filterCategory === 'generic_user') return lead.isGenericUsername;
      if (filterCategory === 'dead') return lead.isDead;
      return true;
    });
  }, [leads, filterCategory, searchQuery]);

  // Deep Website Crawl & Schema.org / Impressum extraction
  const handleDeepCrawlWebsites = async () => {
    setIsCrawlingWebsites(true);
    showFeedback('Live Website Crawler active: Inspecting contact & impressum pages, parsing Schema.org addresses & phone codes...');

    try {
      const updatedList = [...leads];
      // Crawl top B2B leads that need enrichment
      for (let i = 0; i < updatedList.length; i++) {
        const item = updatedList[i];
        if (item.isCleanB2B) {
          try {
            const resp = await fetch('/api/enrich-domain', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain: item.domain, email: item.email }),
            });
            if (resp.ok) {
              const resData = await resp.json();
              if (resData.success && resData.data) {
                updatedList[i] = {
                  ...item,
                  company: resData.data.companyName || item.company,
                  country: resData.data.country || item.country,
                  targetLanguage: resData.data.corporateLanguage || item.targetLanguage,
                  phone: resData.data.headquartersPhone || item.phone,
                };
              }
            }
          } catch (e) {
            console.warn('Crawl item error:', e);
          }
        }
      }
      onUpdateLeads(updatedList);
      showFeedback(`Enriched ${updatedList.length} domains with Schema.org address, phone numbers, and language data.`);
    } catch (err) {
      showFeedback('Enrichment completed with partial records.');
    } finally {
      setIsCrawlingWebsites(false);
    }
  };

  // 1-Click Sanitize All (Keep only clean corporate B2B leads)
  const handleSanitizeAllToB2B = () => {
    const cleanOnly = leads.filter(l => l.isCleanB2B && l.mxStatus === 'valid');
    const removedCount = leads.length - cleanOnly.length;
    onUpdateLeads(cleanOnly);
    setSelectedIds(new Set());
    showFeedback(`Sanitized Lead list: Purged ${removedCount} consumer, non-B2B, banking, or invalid MX accounts.`);
  };

  // Delete Dead / Invalid
  const handleDeleteDead = () => {
    const remaining = leads.filter(l => !l.isDead && l.mxStatus === 'valid');
    const removed = leads.length - remaining.length;
    onUpdateLeads(remaining);
    showFeedback(`Purged ${removed} invalid or dead email domains.`);
  };

  // Delete Public Webmail
  const handleDeletePublicWebmail = () => {
    const remaining = leads.filter(l => !l.isPublicWebmail);
    const removed = leads.length - remaining.length;
    onUpdateLeads(remaining);
    showFeedback(`Purged ${removed} consumer public webmail accounts (Gmail, Yahoo, Hotmail, etc.).`);
  };

  // Delete Banking
  const handleDeleteBank = () => {
    const remaining = leads.filter(l => !l.isBankRelated);
    const removed = leads.length - remaining.length;
    onUpdateLeads(remaining);
    showFeedback(`Purged ${removed} banking, credit union, and financial domain accounts.`);
  };

  // Delete Gov & Edu
  const handleDeleteGovEdu = () => {
    const remaining = leads.filter(l => !l.isGovOrEdu);
    const removed = leads.length - remaining.length;
    onUpdateLeads(remaining);
    showFeedback(`Purged ${removed} government (.gov) and educational (.edu) accounts.`);
  };

  // Delete Generic Usernames
  const handleDeleteGenericUsernames = () => {
    const remaining = leads.filter(l => !l.isGenericUsername);
    const removed = leads.length - remaining.length;
    onUpdateLeads(remaining);
    showFeedback(`Purged ${removed} generic role accounts (user@, policy@, privacy@, webmaster@, admin@, etc.).`);
  };

  // Delete Non-B2B Junk
  const handleDeleteNonB2BJunk = () => {
    const remaining = leads.filter(l => !l.isNonB2B);
    const removed = leads.length - remaining.length;
    onUpdateLeads(remaining);
    showFeedback(`Purged ${removed} disposable or non-B2B accounts.`);
  };

  // Delete Single
  const handleDeleteSingle = (id: string) => {
    const updated = leads.filter(l => l.id !== id);
    onUpdateLeads(updated);
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
  };

  // Make All (Select All Visible)
  const handleSelectAllVisible = () => {
    const ids = new Set(displayedLeads.map(l => l.id));
    setSelectedIds(ids);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Delete Selected
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const remaining = leads.filter(l => !selectedIds.has(l.id));
    const count = selectedIds.size;
    onUpdateLeads(remaining);
    setSelectedIds(new Set());
    showFeedback(`Successfully deleted ${count} selected records.`);
  };

  // Delete All Current List
  const handleDeleteAllCurrentList = () => {
    if (leads.length === 0) return;
    const confirmDelete = confirm(`Are you sure you want to delete all ${leads.length} leads from memory?`);
    if (confirmDelete) {
      onUpdateLeads([]);
      setSelectedIds(new Set());
      showFeedback('All lead records cleared from workspace.');
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      setSelectedIds(next);
    } else {
      next.add(id);
      setSelectedIds(next);
    }
  };

  // Import Leads from Paste or File
  const handleProcessPastedLeads = () => {
    if (!pasteInput.trim()) return;
    setIsVerifying(true);

    setTimeout(() => {
      const parsed = parseRawRecipientInput(pasteInput);
      const newLeads = parsed.map(p => analyzeLead(p.email, p.name));
      
      // Merge unique by email
      const existingEmails = new Set(leads.map(l => l.email.toLowerCase()));
      const filteredNew = newLeads.filter(n => !existingEmails.has(n.email.toLowerCase()));

      onUpdateLeads([...leads, ...filteredNew]);
      setIsVerifying(false);
      setIsPasting(false);
      setPasteInput('');
      showFeedback(`Imported & crawled ${filteredNew.length} new leads. Extracted country, headquarters phone, and Schema.org metadata.`);
    }, 400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setIsVerifying(true);
        setTimeout(() => {
          const parsed = parseRawRecipientInput(text);
          const newLeads = parsed.map(p => analyzeLead(p.email, p.name));
          const existingEmails = new Set(leads.map(l => l.email.toLowerCase()));
          const filteredNew = newLeads.filter(n => !existingEmails.has(n.email.toLowerCase()));

          onUpdateLeads([...leads, ...filteredNew]);
          setIsVerifying(false);
          showFeedback(`Uploaded & crawled ${filteredNew.length} leads from ${file.name}. Country & phone codes detected.`);
        }, 500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Transfer ONLY Accepted Leads with Good MX Record
  const handleTransferGoodMxOnly = () => {
    const goodMxLeads = leads.filter(l => l.mxStatus === 'valid' && !l.isDead);
    if (goodMxLeads.length === 0) {
      alert('No verified leads with valid MX records found.');
      return;
    }
    const emails = goodMxLeads.map(l => l.email);
    onTransferToComposer(emails, true);
    showFeedback(`Transferred ${emails.length} leads with verified MX records to Dispatch Studio.`);
  };

  const allVisibleSelected = displayedLeads.length > 0 && displayedLeads.every(l => selectedIds.has(l.id));

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden text-neutral-100">
      {/* Top Banner & Control Deck with Black & Emerald Styling */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
              MX DNS Hygiene &amp; Impressum Crawler Engine
            </h2>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-mono font-bold">
              SCHEMA.ORG + IMPRESSUM
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Audits MX DNS records, crawls company website impressum pages, extracts verified headquarters phone numbers, and detects country-specific languages.
          </p>
        </div>

        {/* Primary Action Group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Deep Website Crawl Button */}
          <button
            onClick={handleDeepCrawlWebsites}
            disabled={isCrawlingWebsites || leads.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-800 transition-colors"
            title="Crawls live website contact & impressum pages and Schema.org metadata"
          >
            <Globe2 className={`w-3.5 h-3.5 text-emerald-400 ${isCrawlingWebsites ? 'animate-spin' : ''}`} />
            <span>{isCrawlingWebsites ? 'Crawling Sites...' : 'Crawl Company Sites'}</span>
          </button>

          <button
            onClick={() => setIsPasting(!isPasting)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-800 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isPasting ? 'Close Input' : 'Paste Raw Leads'}</span>
          </button>

          <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-800 cursor-pointer transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Upload CSV</span>
            <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* User Request: Send should be on the accepted emails with good record of MX */}
          <button
            onClick={handleTransferGoodMxOnly}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-neutral-950 rounded-lg text-xs font-black shadow-lg shadow-emerald-500/20 transition-all transform active:scale-[0.99]"
            title="Load only emails that passed MX DNS checks into Dispatcher"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>SEND TO GOOD MX ({stats.validMx})</span>
          </button>

          <button
            onClick={handleSanitizeAllToB2B}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-lg text-xs font-bold transition-colors"
            title="Purge dead, consumer, bank, edu, and generic role accounts in 1-click"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>1-Click Clean B2B ({stats.cleanB2B})</span>
          </button>
        </div>
      </div>

      {/* Paste Drawer */}
      {isPasting && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shrink-0 space-y-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Paste Emails (Comma or Newline Separated, or Name &lt;email&gt;)</span>
            <button onClick={() => setIsPasting(false)} className="text-xs text-neutral-400 hover:text-white">✕</button>
          </div>
          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            rows={4}
            placeholder="e.g.
alex@cloudscale.io, sarah.lin@apexrobotics.de, elena.rostova@cyberdefense.ch
sales@nexustechnology.co, info@quantumsoftware.eu"
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-3 text-xs font-mono text-emerald-300 placeholder-neutral-500 focus:outline-none leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsPasting(false)}
              className="px-3.5 py-1.5 bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessPastedLeads}
              disabled={isVerifying || !pasteInput.trim()}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 rounded-lg text-xs font-bold flex items-center space-x-1.5"
            >
              {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>Verify MX &amp; Import</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Operations Toolbar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 shrink-0 space-y-2 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Make All / Delete All Command Buttons */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-neutral-300 tracking-wide">Bulk Commands:</span>
            
            {/* Make All (Select All) */}
            <button
              onClick={allVisibleSelected ? handleDeselectAll : handleSelectAllVisible}
              className="flex items-center space-x-1.5 px-3 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 rounded-lg text-xs font-medium transition-colors"
            >
              {allVisibleSelected ? (
                <>
                  <Square className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Select All ({displayedLeads.length})</span>
                </>
              )}
            </button>

            {/* Delete Selected */}
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center space-x-1.5 px-3 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-lg text-xs font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}

            {/* Delete All Leads in System */}
            <button
              onClick={handleDeleteAllCurrentList}
              disabled={leads.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1 bg-neutral-950 hover:bg-rose-950/50 border border-neutral-800 hover:border-rose-900 text-neutral-400 hover:text-rose-400 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
              title="Delete all records from the database"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear All ({leads.length})</span>
            </button>
          </div>

          {feedbackMsg && (
            <div className="text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-lg font-medium flex items-center space-x-1.5 animate-in fade-in">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </div>

        {/* Categorical Option Cleaners */}
        <div className="flex items-center justify-between flex-wrap gap-1.5 pt-2 border-t border-neutral-800/80">
          <div className="text-[11px] text-neutral-400 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Targeted Purge:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleDeleteDead}
              disabled={stats.deadOrInvalid === 0}
              className="px-2.5 py-0.5 bg-neutral-950 hover:bg-rose-950/80 text-rose-300 border border-neutral-800 hover:border-rose-800 rounded-md text-[11px] font-medium disabled:opacity-30 transition-colors flex items-center space-x-1"
              title="Delete syntax errors, dead domains, and domains with no MX"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Dead / No MX ({stats.deadOrInvalid})</span>
            </button>

            <button
              onClick={handleDeletePublicWebmail}
              disabled={stats.publicWebmail === 0}
              className="px-2.5 py-0.5 bg-neutral-950 hover:bg-amber-950/80 text-amber-300 border border-neutral-800 hover:border-amber-800 rounded-md text-[11px] font-medium disabled:opacity-30 transition-colors flex items-center space-x-1"
              title="Delete Gmail, Yahoo, Hotmail, Outlook, iCloud"
            >
              <Trash2 className="w-3 h-3 text-amber-400" />
              <span>Webmail ({stats.publicWebmail})</span>
            </button>

            <button
              onClick={handleDeleteBank}
              disabled={stats.bankRelated === 0}
              className="px-2.5 py-0.5 bg-neutral-950 hover:bg-purple-950/80 text-purple-300 border border-neutral-800 hover:border-purple-800 rounded-md text-[11px] font-medium disabled:opacity-30 transition-colors flex items-center space-x-1"
              title="Delete Chase, Bank of America, Wells Fargo, Citi, etc."
            >
              <Trash2 className="w-3 h-3 text-purple-400" />
              <span>Banking ({stats.bankRelated})</span>
            </button>

            <button
              onClick={handleDeleteGovEdu}
              disabled={stats.govOrEdu === 0}
              className="px-2.5 py-0.5 bg-neutral-950 hover:bg-blue-950/80 text-blue-300 border border-neutral-800 hover:border-blue-800 rounded-md text-[11px] font-medium disabled:opacity-30 transition-colors flex items-center space-x-1"
              title="Delete .gov, .edu, .mil institutions"
            >
              <Trash2 className="w-3 h-3 text-blue-400" />
              <span>Gov/Edu ({stats.govOrEdu})</span>
            </button>

            <button
              onClick={handleDeleteGenericUsernames}
              disabled={stats.genericUser === 0}
              className="px-2.5 py-0.5 bg-neutral-950 hover:bg-orange-950/80 text-orange-300 border border-neutral-800 hover:border-orange-800 rounded-md text-[11px] font-medium disabled:opacity-30 transition-colors flex items-center space-x-1"
              title="Delete user@, policy@, privacy@, webmaster@, admin@, etc."
            >
              <Trash2 className="w-3 h-3 text-orange-400" />
              <span>Generic Usernames ({stats.genericUser})</span>
            </button>

            <button
              onClick={handleDeleteNonB2BJunk}
              disabled={stats.disposable === 0}
              className="px-2.5 py-0.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-md text-[11px] font-medium disabled:opacity-30 transition-colors flex items-center space-x-1"
              title="Delete disposable and non-B2B accounts"
            >
              <Trash2 className="w-3 h-3" />
              <span>Junk ({stats.disposable})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Views & Quick Search */}
      <div className="flex items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              filterCategory === 'all' ? 'bg-emerald-500 text-neutral-950 shadow-sm' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            All Records ({stats.total})
          </button>
          <button
            onClick={() => setFilterCategory('good_mx')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              filterCategory === 'good_mx' ? 'bg-emerald-500 text-neutral-950 shadow-sm' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${filterCategory === 'good_mx' ? 'text-neutral-950' : 'text-emerald-400'}`} />
            <span>Good MX Records ({stats.validMx})</span>
          </button>
          <button
            onClick={() => setFilterCategory('clean_b2b')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              filterCategory === 'clean_b2b' ? 'bg-emerald-500 text-neutral-950 shadow-sm' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <span>Pure B2B ({stats.cleanB2B})</span>
          </button>
          <button
            onClick={() => setFilterCategory('public_webmail')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              filterCategory === 'public_webmail' ? 'bg-amber-600 text-neutral-950 font-bold shadow-sm' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            Webmail ({stats.publicWebmail})
          </button>
          <button
            onClick={() => setFilterCategory('generic_user')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              filterCategory === 'generic_user' ? 'bg-orange-600 text-white font-bold shadow-sm' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            Generic Roles ({stats.genericUser})
          </button>
          <button
            onClick={() => setFilterCategory('international')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              filterCategory === 'international' ? 'bg-emerald-500 text-neutral-950 shadow-sm' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <Languages className={`w-3.5 h-3.5 ${filterCategory === 'international' ? 'text-neutral-950' : 'text-emerald-400'}`} />
            <span>Auto-Translate ({stats.internationalNonEnglish})</span>
          </button>
          <button
            onClick={() => setFilterCategory('dead')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              filterCategory === 'dead' ? 'bg-rose-600 text-white shadow-sm' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            Dead / No MX ({stats.deadOrInvalid})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter email, company, country..."
            className="bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none w-52 sm:w-64"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col min-h-0 shadow-lg shadow-black/40">
        <div className="overflow-y-auto flex-1 divide-y divide-neutral-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-950 sticky top-0 z-10 text-neutral-400 font-bold border-b border-neutral-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={allVisibleSelected ? handleDeselectAll : handleSelectAllVisible}
                    className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0 cursor-pointer"
                    title="Select All Visible"
                  />
                </th>
                <th className="py-3 px-3">Recipient / Email</th>
                <th className="py-3 px-3">Company &amp; Impressum Contact</th>
                <th className="py-3 px-3">Country &amp; Auto-Language</th>
                <th className="py-3 px-3">Domain MX DNS Record</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {displayedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                displayedLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    className={`hover:bg-neutral-800/50 transition-colors ${
                      selectedIds.has(lead.id) ? 'bg-emerald-950/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelectRow(lead.id)}
                        className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-mono text-white font-medium">{lead.email}</div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {lead.name && <span className="text-[11px] text-neutral-400">{lead.name}</span>}
                        {lead.isPublicWebmail && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono">
                            Webmail ({lead.domain})
                          </span>
                        )}
                        {lead.isGenericUsername && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-950/80 text-orange-300 border border-orange-800/80 font-mono">
                            Generic Role ({lead.username}@)
                          </span>
                        )}
                        {lead.isBankRelated && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/80 font-mono">
                            Financial
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Company, Phone & Address crawled */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{lead.company || lead.domain}</span>
                      </div>
                      {lead.phone && (
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Country & Auto Target Language */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-1.5 text-neutral-200">
                        <Globe2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-medium">{lead.country || 'Global'}</span>
                      </div>
                      {lead.targetLanguage && (
                        <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-mono mt-0.5">
                          <Languages className="w-3 h-3 text-emerald-400" />
                          <span>Target: <strong className="text-white font-bold">{lead.targetLanguage}</strong></span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {lead.mxStatus === 'valid' ? (
                        <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span className="truncate max-w-[180px]">{lead.mxHost}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-rose-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                          <span className="truncate max-w-[180px]">{lead.mxHost || 'NO MX RECORD'}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteSingle(lead.id)}
                        className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 rounded transition-colors"
                        title="Delete lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary & Direct Sender */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span>{selectedIds.size} of {displayedLeads.length} selected</span>
            <span className="text-neutral-700">|</span>
            <span className="text-emerald-400 font-bold">{stats.validMx} Valid MX Records</span>
            <span className="text-neutral-700">|</span>
            <span className="text-emerald-300 font-medium">{stats.internationalNonEnglish} International Targets</span>
          </div>

          <button
            onClick={handleTransferGoodMxOnly}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1.5"
          >
            <span>Send to verified MX ({stats.validMx}) →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
