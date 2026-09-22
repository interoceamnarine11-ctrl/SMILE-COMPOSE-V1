import React, { useState, useEffect } from 'react';
import { SmtpServer, LeadItem, EnterpriseLicense } from './types';
import { INITIAL_SMTPS, INITIAL_LEADS } from './mockData';
import { Navbar, StreamlinedTab } from './components/Navbar';
import { ComposerDispatcher } from './components/ComposerDispatcher';
import { LeadScrubber } from './components/LeadScrubber';
import { SmtpManager } from './components/SmtpManager';
import { LicenseModal } from './components/LicenseModal';
import { globalWakeLock } from './utils/wakeLock';

export default function App() {
  const [activeTab, setActiveTab] = useState<StreamlinedTab>('composer');

  // Core Persistent State
  const [servers, setServers] = useState<SmtpServer[]>(INITIAL_SMTPS);
  const [leads, setLeads] = useState<LeadItem[]>(INITIAL_LEADS);
  const [composerRecipientText, setComposerRecipientText] = useState<string>('');
  const [initialOnlyGoodMx, setInitialOnlyGoodMx] = useState<boolean>(false);

  // Enterprise Commercial License State (for commercial sale & white-label distribution)
  const [license, setLicense] = useState<EnterpriseLicense>({
    organization: 'Acme Global Enterprises Inc.',
    licensee: 'Corporate Operations Lead',
    licenseKey: 'SMILE-COMMERCIAL-9842-8819-B2B9-ENT7',
    edition: 'Enterprise Commercial Suite',
    validUntil: 'Perpetual Commercial Deployment (v5.8 Enterprise)',
    nodeId: 'NODE-SMILE-CLUSTER-0914-ACTIVE',
    isActivated: true,
  });
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  // Full-Screen Support
  const [isFullscreen, setIsFullscreen] = useState(false);

  // No Sleep / Screen Wake Lock to prevent machine shut down during sends
  const [noSleepActive, setNoSleepActive] = useState(false);

  useEffect(() => {
    const unsub = globalWakeLock.subscribe((active) => {
      setNoSleepActive(active);
    });
    return () => unsub();
  }, []);

  // Handle BeforeUnload when active tasks are running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (noSleepActive) {
        e.preventDefault();
        e.returnValue = 'Active email dispatching or SMTP audit in progress. Are you sure you want to close?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [noSleepActive]);

  const toggleNoSleep = async () => {
    if (noSleepActive) {
      await globalWakeLock.disable();
    } else {
      await globalWakeLock.enable();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    }
  };

  // Listen to fullscreen changes from Esc key
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const activeSmtpCount = servers.filter(
    s => s.status === 'verified' || s.status === 'active'
  ).length;

  const cleanB2BCount = leads.filter(l => l.isCleanB2B).length;

  const handleTransferCleanedLeadsToComposer = (emails: string[], onlyGoodMx: boolean = true) => {
    const formatted = emails.join(', ');
    setComposerRecipientText(formatted);
    setInitialOnlyGoodMx(onlyGoodMx);
    setActiveTab('composer');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-950 text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950">
      {/* High-End Dark Header with Emerald Glow */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        smtpCount={servers.length}
        activeSmtpCount={activeSmtpCount}
        leadCount={leads.length}
        cleanB2BCount={cleanB2BCount}
        isSending={false}
        license={license}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        noSleepActive={noSleepActive}
        onToggleNoSleep={toggleNoSleep}
      />

      {/* Main Full-Screen Canvas with Black/Neutral-950 base, emerald highlights, and crisp white cards */}
      <main className="flex-1 overflow-hidden p-2.5 sm:p-3 min-h-0 bg-neutral-950">
        {activeTab === 'composer' && (
          <ComposerDispatcher
            servers={servers}
            leads={leads}
            initialRecipientText={composerRecipientText}
            initialOnlyGoodMx={initialOnlyGoodMx}
            onOpenLeadsTab={() => setActiveTab('lead_scrubber')}
            onOpenSmtpTab={() => setActiveTab('smtp_relays')}
            noSleepActive={noSleepActive}
            onEnableNoSleep={() => globalWakeLock.enable()}
          />
        )}

        {activeTab === 'lead_scrubber' && (
          <LeadScrubber
            leads={leads}
            onUpdateLeads={setLeads}
            onTransferToComposer={handleTransferCleanedLeadsToComposer}
          />
        )}

        {activeTab === 'smtp_relays' && (
          <div className="h-full overflow-hidden">
            <SmtpManager
              servers={servers}
              onUpdateServers={setServers}
            />
          </div>
        )}
      </main>

      {/* Enterprise License Modal */}
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        license={license}
        onUpdateLicense={setLicense}
      />
    </div>
  );
}
