import React, { useState } from 'react';
import { EnterpriseLicense } from '../types';
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Key, 
  Building, 
  Calendar, 
  Cpu, 
  X, 
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: EnterpriseLicense;
  onUpdateLicense: (updated: EnterpriseLicense) => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  license,
  onUpdateLicense,
}) => {
  const [org, setOrg] = useState(license.organization);
  const [licensee, setLicensee] = useState(license.licensee);
  const [key, setKey] = useState(license.licenseKey);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLicense({
      ...license,
      organization: org.trim() || 'Global Enterprise Corp',
      licensee: licensee.trim() || 'Chief Executive Operations',
      licenseKey: key.trim() || license.licenseKey,
      isActivated: true,
    });
    setIsEditing(false);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(license.licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Black & Emerald styling */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 text-white flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Award className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">Enterprise Commercial Certificate</h3>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-mono font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">SMILE MAILER Enterprise Licensing &amp; Compliance</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Body */}
        <div className="p-5 space-y-4">
          {!isEditing ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5 font-medium">
                    <Building className="w-3.5 h-3.5 text-emerald-400" />
                    Licensed Organization:
                  </span>
                  <strong className="text-white font-bold text-sm">{license.organization}</strong>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5 font-medium">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    Authorized Licensee:
                  </span>
                  <span className="text-neutral-200 font-semibold">{license.licensee}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    License Term / Validity:
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">{license.validUntil}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5 font-medium">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    Cluster Node ID:
                  </span>
                  <span className="text-neutral-300 font-mono text-[11px]">{license.nodeId}</span>
                </div>
              </div>

              {/* License Key box with copy button */}
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 flex items-center gap-1.5 font-mono font-semibold">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    Cryptographic Signature:
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 transition-colors text-[11px] font-bold"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Signature'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-emerald-400 break-all select-all bg-neutral-900/90 p-2.5 rounded-lg border border-neutral-800 font-medium">
                  {license.licenseKey}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Verified for Commercial Sale &amp; Enterprise White-Label</span>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  Edit Owner
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Company / Organization Name:</label>
                <input
                  type="text"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="e.g. Apex Global Technologies Inc."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Licensee / Operations Lead:</label>
                <input
                  type="text"
                  value={licensee}
                  onChange={(e) => setLicensee(e.target.value)}
                  placeholder="e.g. Infrastructure Executive"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Commercial License Key / Certificate Hash:</label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="SMILE-ENT-XXXX-XXXX-XXXX"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs font-mono text-emerald-300 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg text-xs font-bold shadow-md"
                >
                  Apply Certificate
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Enterprise Support Tier: Platinum 24/7 SLA</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 rounded-lg text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
