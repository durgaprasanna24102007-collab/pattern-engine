import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Mail, 
  CreditCard, 
  Fingerprint, 
  Key, 
  Phone, 
  Settings, 
  Cpu, 
  Heart, 
  ShieldAlert, 
  X,
  Code
} from 'lucide-react';
import { Pattern, Severity } from '../types';

interface PatternsViewProps {
  patterns: Pattern[];
  onTogglePattern: (id: string) => void;
  onAddPattern: (newPattern: Omit<Pattern, 'id' | 'enabled'>) => void;
  velocity: string;
  health: string;
}

export default function PatternsView({
  patterns,
  onTogglePattern,
  onAddPattern,
  velocity,
  health
}: PatternsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form modal states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('PII');
  const [formType, setFormType] = useState('Standard');
  const [formRegex, setFormRegex] = useState('');
  const [formSeverity, setFormSeverity] = useState<Severity>('Medium');
  const [formIcon, setFormIcon] = useState<Pattern['iconName']>('custom');
  const [formError, setFormError] = useState('');

  // Handle new pattern submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRegex.trim()) {
      setFormError('Name and regex expression are required.');
      return;
    }

    try {
      // Validate that Regex is actually compilable
      new RegExp(formRegex);
    } catch (err) {
      setFormError('Invalid regular expression syntax.');
      return;
    }

    onAddPattern({
      name: formName.trim(),
      category: formCategory,
      type: formType,
      regexStr: formRegex.trim(),
      severity: formSeverity,
      iconName: formIcon
    });

    // Reset Form
    setFormName('');
    setFormCategory('PII');
    setFormType('Standard');
    setFormRegex('');
    setFormSeverity('Medium');
    setFormIcon('custom');
    setFormError('');
    setIsModalOpen(false);
  };

  // Filter patterns based on search query
  const filteredPatterns = patterns.filter(pat => {
    const query = searchTerm.toLowerCase();
    return (
      pat.name.toLowerCase().includes(query) ||
      pat.regexStr.toLowerCase().includes(query) ||
      pat.category.toLowerCase().includes(query) ||
      pat.type.toLowerCase().includes(query)
    );
  });

  // Mapper helper for icons
  const renderPatternIcon = (iconName: Pattern['iconName'], className: string) => {
    switch (iconName) {
      case 'alternate_email':
        return <Mail className={className} />;
      case 'credit_card':
        return <CreditCard className={className} />;
      case 'badge':
        return <Fingerprint className={className} />;
      case 'vpn_key':
        return <Key className={className} />;
      case 'phone':
        return <Phone className={className} />;
      default:
        return <Settings className={className} />;
    }
  };

  // Helper for severity pill classes
  const getSeverityPillClass = (severity: Severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityDotColor = (severity: Severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-600';
      case 'High':
        return 'bg-orange-600';
      case 'Medium':
        return 'bg-blue-600';
      case 'Low':
        return 'bg-gray-500';
    }
  };

  const activePatternsCount = patterns.filter(p => p.enabled).length;

  return (
    <div className="space-y-6 pb-24">
      {/* Search Bar */}
      <section className="relative">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline h-5 w-5" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm transition-all shadow-xs font-sans"
            placeholder="Search patterns by name, regex, or category..."
          />
        </div>
      </section>

      {/* Info Boxes (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Patterns box */}
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-outline uppercase tracking-wider font-mono">Active Patterns</span>
            <Code className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-primary font-sans">{activePatternsCount}</span>
            <p className="text-[11px] text-on-surface-variant font-sans mt-1">Scanning real-time streams</p>
          </div>
        </div>

        {/* Alert Velocity box */}
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-outline uppercase tracking-wider font-mono">Alert Velocity</span>
            <Cpu className="h-5 w-5 text-tertiary-container text-orange-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-on-surface font-sans">{velocity}</span>
            <p className="text-[11px] text-on-surface-variant font-sans mt-1">Matches detected last 24h</p>
          </div>
        </div>

        {/* Engine Health box */}
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-outline uppercase tracking-wider font-mono">Engine Health</span>
            <Plus className="h-5 w-5 text-secondary rotate-45" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-secondary font-sans">{health}</span>
            <p className="text-[11px] text-on-surface-variant font-sans mt-1">Latency {"<"} 12ms (Target: 50ms)</p>
          </div>
        </div>
      </div>

      {/* Rule List Container */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest font-mono">
          System Core Signatures ({filteredPatterns.length})
        </h3>

        {filteredPatterns.length === 0 ? (
          <div className="text-center py-12 p-8 bg-white border border-outline-variant rounded-xl">
            <p className="text-sm font-sans text-on-surface-variant">No rules matching your search query.</p>
          </div>
        ) : (
          filteredPatterns.map((pat) => (
            <div 
              key={pat.id}
              className={`glass-card p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all ${
                !pat.enabled ? 'opacity-60 grayscale-[40%]' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg bg-primary-container/15 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0`}>
                  {renderPatternIcon(pat.iconName, 'h-5 w-5')}
                </div>
                
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-on-surface font-sans leading-none">
                    {pat.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-mono text-on-surface-variant">
                      {pat.category}
                    </span>
                    <span className="bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded text-[10px] font-mono">
                      {pat.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Severity & Trigger Area */}
              <div className="flex items-center justify-between sm:justify-end gap-4">
                {/* Regex code string block */}
                <div className="text-right hidden lg:block max-w-xs shrink">
                  <code className="text-[10px] font-mono text-outline bg-surface-container-low px-2 py-1 rounded truncate block" title={pat.regexStr}>
                    /{pat.regexStr.substring(0, 22)}{pat.regexStr.length > 22 ? '...' : ''}/
                  </code>
                </div>

                <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold flex items-center gap-1.5 border ${getSeverityPillClass(pat.severity)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getSeverityDotColor(pat.severity)}`} />
                  {pat.severity}
                </div>

                {/* iOS styling switch */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    checked={pat.enabled}
                    onChange={() => onTogglePattern(pat.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB - Fixed Bottom Right Floating Action Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/95 active:scale-95 transition-all flex items-center justify-center z-40 group cursor-pointer"
        title="Add New Pattern"
      >
        <Plus className="h-6 w-6 font-bold" />
        <span className="absolute right-full mr-4 bg-inverse-surface text-inverse-on-surface px-3 py-1.5 rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xs">
          Add New Pattern
        </span>
      </button>

      {/* Add New Pattern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-outline-variant w-full max-w-md rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface font-sans">Add Signature Pattern</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs font-sans">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                  Pattern Name
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. AWS Token Finder, Slack ID"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none font-sans"
                />
              </div>

              {/* Grid 2Cols: Category & Rule Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-sans"
                  >
                    <option value="PII">PII</option>
                    <option value="Financial">Financial</option>
                    <option value="Creds">Creds</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                    Rule Badge Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-sans"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Sensitive">Sensitive</option>
                    <option value="Developer">Developer</option>
                    <option value="PCI-DSS">PCI-DSS</option>
                    <option value="Global">Global</option>
                  </select>
                </div>
              </div>

              {/* Regex */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-mono flex justify-between items-center">
                  <span>Regular Expression</span>
                  <span className="text-[9px] text-primary lowercase tracking-tight normal-case">JavaScript format, without slashes</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. A[0-9]{5}[A-Z]"
                  value={formRegex}
                  onChange={(e) => setFormRegex(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-outline-variant rounded-lg text-xs font-mono focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              {/* Severity & Icon Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                    Alert Severity
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as Severity)}
                    className="w-full px-3.5 py-2.5 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-sans"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-mono flex items-center gap-1">
                    <span>Icon Set</span>
                  </label>
                  <select
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-sans"
                  >
                    <option value="custom">Standard / Code</option>
                    <option value="alternate_email">Email envelope</option>
                    <option value="credit_card">Credit Card card</option>
                    <option value="badge">SSN Fingerprint</option>
                    <option value="vpn_key">Developer Key</option>
                    <option value="phone">Phone Receiver</option>
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-outline-variant">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 border border-outline text-on-surface text-sm font-semibold rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/95 transition-colors cursor-pointer"
                >
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

