import React from 'react';
import { 
  Send, 
  ShieldCheck, 
  Server, 
  Zap, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  Lock, 
  Building, 
  Key, 
  ShieldAlert, 
  Activity, 
  Award, 
  Mail, 
  Sparkles,
  Flame,
  Radio,
  Layers,
  Inbox
} from 'lucide-react';
import { EnterpriseLicense } from '../types';

export type StreamlinedTab = 'composer' | 'lead_scrubber' | 'smtp_relays';

interface NavbarProps {
  activeTab: StreamlinedTab;
  onTabChange: (tab: StreamlinedTab) => void;
  smtpCount: number;
  activeSmtpCount: number;
  leadCount: number;
  cleanB2BCount: number;
  isSending: boolean;
  license: EnterpriseLicense;
  onOpenLicenseModal: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  noSleepActive: boolean;
  onToggleNoSleep: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  smtpCount,
  activeSmtpCount,
  leadCount,
  cleanB2BCount,
  isSending,
  license,
  onOpenLicenseModal,
  isFullscreen,
  onToggleFullscreen,
  noSleepActive,
  onToggleNoSleep,
}) => {
  return (
    <header className="bg-neutral-950 text-white shrink-0 px-4 h-14 flex items-center justify-between z-30 select-none border-b border-neutral-800 shadow-md">
      {/* Left: Brand Identity with Green Neon Glow Accent & Profound Icon */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-neutral-950 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/50">
            <Mail className="w-5 h-5 stroke-[2.2]" />
          </div>
          {isSending && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          )}
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-black tracking-wider text-white flex items-center gap-1.5">
              <span>SMILE</span>
              <span className="text-emerald-400 font-extrabold">MAILER</span>
            </h1>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-mono font-bold tracking-tight">
              PRO v5.8
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            High-Volume Rotational SMTP Engine
          </span>
        </div>

        {/* License clickable pill */}
        <button
          onClick={onOpenLicenseModal}
          className="hidden xl:flex items-center space-x-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 px-2.5 py-1 rounded-lg transition-colors ml-2"
          title="Click to view license certificate and commercial details"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
          <span className="truncate max-w-[170px] text-[11px] font-medium">
            {license.organization}
          </span>
          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-0.5" />
        </button>
      </div>

      {/* Center: Profound Navigation Tabs with Emerald Active Badges */}
      <nav className="flex items-center space-x-1.5 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800/80 shadow-inner">
        <button
          id="tab-composer"
          onClick={() => onTabChange('composer')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'composer'
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-neutral-950 shadow-md shadow-emerald-950 font-bold'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Send className={`w-4 h-4 stroke-[2.2] ${activeTab === 'composer' ? 'text-neutral-950' : 'text-emerald-400'}`} />
          <span>Dispatch Studio</span>
          {isSending && (
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          )}
        </button>

        <button
          id="tab-lead-scrubber"
          onClick={() => onTabChange('lead_scrubber')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'lead_scrubber'
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-neutral-950 shadow-md shadow-emerald-950 font-bold'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 stroke-[2.2] ${activeTab === 'lead_scrubber' ? 'text-neutral-950' : 'text-emerald-400'}`} />
          <span>Lead &amp; MX Hygiene</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
            activeTab === 'lead_scrubber' ? 'bg-neutral-950/30 text-neutral-950' : 'bg-neutral-800 text-emerald-400 border border-emerald-900/40'
          }`}>
            {cleanB2BCount}/{leadCount}
          </span>
        </button>

        <button
          id="tab-smtp-relays"
          onClick={() => onTabChange('smtp_relays')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'smtp_relays'
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-neutral-950 shadow-md shadow-emerald-950 font-bold'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Server className={`w-4 h-4 stroke-[2.2] ${activeTab === 'smtp_relays' ? 'text-neutral-950' : 'text-emerald-400'}`} />
          <span>SMTP Cluster</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
            activeTab === 'smtp_relays' ? 'bg-neutral-950/30 text-neutral-950' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
          }`}>
            {activeSmtpCount} Active
          </span>
        </button>
      </nav>

      {/* Right: Controls (No-Sleep lock, Fullscreen, License) */}
      <div className="flex items-center space-x-2 text-xs">
        {/* No Sleep Screen Wake Lock */}
        <button
          onClick={onToggleNoSleep}
          id="btn-no-sleep"
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            noSleepActive 
              ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-950/50' 
              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700'
          }`}
          title={noSleepActive ? 'No-Sleep Active: System kept awake during bulk transmission' : 'Enable No-Sleep to prevent PC sleep'}
        >
          <Zap className={`w-3.5 h-3.5 stroke-[2.5] ${noSleepActive ? 'text-neutral-950 fill-neutral-950' : 'text-amber-400'}`} />
          <span className="hidden sm:inline">{noSleepActive ? 'AWAKE ON' : 'Stay Awake'}</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          id="btn-fullscreen"
          className="p-1.5 sm:px-3 sm:py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 border border-neutral-800 transition-colors"
          title={isFullscreen ? 'Exit Full Screen' : 'Expand to Full Screen'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Exit</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Full Screen</span>
            </>
          )}
        </button>

        {/* Commercial Details Button */}
        <button
          onClick={onOpenLicenseModal}
          id="btn-license-modal"
          className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-emerald-900/50 hover:border-emerald-700 rounded-lg transition-colors font-medium"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px]">Certificate</span>
        </button>
      </div>
    </header>
  );
};
