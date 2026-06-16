import React, { useState } from 'react';
import { Plus, Search, Mail, CreditCard, Fingerprint, Key, Phone, Settings, Cpu, Code, ShieldAlert, X } from 'lucide-react';
import { Pattern, Severity } from '../types';

interface PatternsViewProps {
  patterns: Pattern[];
  onTogglePattern: (id: string) => void;
  onAddPattern: (newPattern: Omit<Pattern, 'id' | 'enabled'>) => void;
  velocity: string;
  health: string;
}

export default function PatternsView({ patterns, onTogglePattern, onAddPattern, velocity, health }: PatternsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('PII');
  const [formType, setFormType] = useState('Standard');
  const [formRegex, setFormRegex] = useState('');
  const [formSeverity, setFormSeverity] = useState<Severity>('Medium');
  const [formIcon, setFormIcon] = useState<Pattern['iconName']>('custom');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRegex.trim()) { setFormError('Name and regex are required.'); return; }
    try { new RegExp(formRegex); } catch { setFormError('Invalid regular expression syntax.'); return; }
    onAddPattern({ name: formName.trim(), category: formCategory, type: formType, regexStr: formRegex.trim(), severity: formSeverity, iconName: formIcon });
    setFormName(''); setFormCategory('PII'); setFormType('Standard'); setFormRegex('');
    setFormSeverity('Medium'); setFormIcon('custom'); setFormError(''); setIsModalOpen(false);
  };

  const filteredPatterns = patterns.filter(pat => {
    const q = searchTerm.toLowerCase();
    return pat.name.toLowerCase().includes(q) || pat.regexStr.toLowerCase().includes(q) || pat.category.toLowerCase().includes(q) || pat.type.toLowerCase().includes(q);
  });

  const renderIcon = (iconName: Pattern['iconName'], cls: string) => {
    switch (iconName) {
      case 'alternate_email': return <Mail className={cls} />;
      case 'credit_card': return <CreditCard className={cls} />;
      case 'badge': return <Fingerprint className={cls} />;
      case 'vpn_key': return <Key className={cls} />;
      case 'phone': return <Phone className={cls} />;
      default: return <Settings className={cls} />;
    }
  };

  const getSeverityPill = (s: Severity) => {
    if (s === 'Critical') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'High') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (s === 'Medium') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getSeverityDot = (s: Severity) => {
    if (s === 'Critical') return 'bg-red-600';
    if (s === 'High') return 'bg-orange-600';
    if (s === 'Medium') return 'bg-blue-600';
    return 'bg-slate-500';
  };

  const activePatternsCount = patterns.filter(p => p.enabled).length;

  return (
    <div className="space-y-6 pb-24">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm transition-all shadow-sm"
          placeholder="Search patterns by name, regex, or category..." />
      </div>

      {/* Info Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Active Patterns</span>
            <Code className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-primary">{activePatternsCount}</span>
            <p className="text-[11px] text-muted-foreground mt-1">Scanning real-time streams</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Alert Velocity</span>
            <Cpu className="h-5 w-5 text-orange-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-foreground">{velocity}</span>
            <p className="text-[11px] text-muted-foreground mt-1">Matches detected last 24h</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Engine Health</span>
            <Plus className="h-5 w-5 text-green-500 rotate-45" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-green-600">{health}</span>
            <p className="text-[11px] text-muted-foreground mt-1">Latency &lt; 12ms (Target: 50ms)</p>
          </div>
        </div>
      </div>

      {/* Pattern List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">
          System Core Signatures ({filteredPatterns.length})
        </h3>

        {filteredPatterns.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl shadow-sm">
            <p className="text-sm text-muted-foreground">No patterns matching your search.</p>
          </div>
        ) : filteredPatterns.map(pat => (
          <div key={pat.id} className={`glass-card p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all shadow-sm ${!pat.enabled ? 'opacity-60 grayscale-[40%]' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                {renderIcon(pat.iconName, 'h-5 w-5')}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground leading-none">{pat.name}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-mono text-muted-foreground">{pat.category}</span>
                  <span className="bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded text-[10px] font-mono">{pat.type}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="hidden lg:block max-w-xs shrink text-right">
                <code className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded truncate block" title={pat.regexStr}>
                  /{pat.regexStr.substring(0, 22)}{pat.regexStr.length > 22 ? '...' : ''}/
                </code>
              </div>

              <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border ${getSeverityPill(pat.severity)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getSeverityDot(pat.severity)}`} />
                {pat.severity}
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={pat.enabled} onChange={() => onTogglePattern(pat.id)} className="sr-only peer" />
                <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center z-40 group cursor-pointer">
        <Plus className="h-6 w-6" />
        <span className="absolute right-full mr-4 bg-foreground text-background px-3 py-1.5 rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-sm">
          Add New Pattern
        </span>
      </button>

      {/* Add Pattern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Add Signature Pattern</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:bg-muted p-1.5 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs">{formError}</div>}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Pattern Name</label>
                <input type="text" required placeholder="e.g. AWS Token Finder" value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Category</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary">
                    {['PII', 'Financial', 'Creds', 'Custom'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Rule Type</label>
                  <select value={formType} onChange={e => setFormType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary">
                    {['Standard', 'Sensitive', 'Developer', 'PCI-DSS', 'Global'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Regular Expression <span className="text-[9px] text-primary normal-case tracking-tight">(no slashes)</span></label>
                <input type="text" required placeholder="e.g. A[0-9]{5}[A-Z]" value={formRegex} onChange={e => setFormRegex(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-xs font-mono focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Severity</label>
                  <select value={formSeverity} onChange={e => setFormSeverity(e.target.value as Severity)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary">
                    {['Low', 'Medium', 'High', 'Critical'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Icon</label>
                  <select value={formIcon} onChange={e => setFormIcon(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary">
                    <option value="custom">Standard / Code</option>
                    <option value="alternate_email">Email</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="badge">Fingerprint</option>
                    <option value="vpn_key">API Key</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 border border-border text-foreground text-sm font-semibold rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit"
                  className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                  Create Signature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
