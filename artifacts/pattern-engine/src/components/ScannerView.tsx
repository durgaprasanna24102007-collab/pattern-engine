import React, { useState, useRef } from 'react';
import {
  CloudUpload, Paperclip, Terminal, FileText, ShieldCheck, AlertTriangle, Eye, EyeOff,
  Play, Trash2, Lock, Database, RefreshCw
} from 'lucide-react';
import { Pattern, ScanTask, SecurityAlert, ActivityLog } from '../types';

interface ScannerViewProps {
  patterns: Pattern[];
  scans: ScanTask[];
  onTriggerScan: (fileName: string, size: string, resultsCount: number, detectedAlerts: Omit<SecurityAlert, 'id' | 'timestamp'>[]) => void;
  onQuickPasteScan: (findingsCount: number, alertsList: Omit<SecurityAlert, 'id' | 'timestamp'>[]) => void;
  onAddLog: (level: ActivityLog['level'], message: string, details?: string) => void;
  onCancelScan: (id: string) => void;
}

export default function ScannerView({ patterns, scans, onTriggerScan, onQuickPasteScan, onAddLog, onCancelScan }: ScannerViewProps) {
  const [pastedText, setPastedText] = useState('');
  const [autoMask, setAutoMask] = useState(true);
  const [scanDepth, setScanDepth] = useState<'Standard' | 'Deep' | 'Paranoid'>('Deep');
  const [isDragging, setIsDragging] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [detectedLeaks, setDetectedLeaks] = useState<Array<{ patternName: string; match: string; index: number; severity: string }>>([]);
  const [sanitizedPreview, setSanitizedPreview] = useState('');
  const [showSanitized, setShowSanitized] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDepthCycle = () => {
    const next = scanDepth === 'Standard' ? 'Deep' : scanDepth === 'Deep' ? 'Paranoid' : 'Standard';
    setScanDepth(next);
    onAddLog('info', `Scan depth configured to ${next}`);
  };

  const executeScan = (textToScan: string) => {
    if (!textToScan.trim()) return { findings: [], sanitized: '' };
    const activeRules = patterns.filter(p => p.enabled);
    const findings: Array<{ patternName: string; match: string; index: number; severity: string }> = [];
    let redacted = textToScan;
    activeRules.forEach(rule => {
      try {
        const regex = new RegExp(rule.regexStr, 'g');
        let m;
        while ((m = regex.exec(textToScan)) !== null) {
          findings.push({ patternName: rule.name, match: m[0], index: m.index, severity: rule.severity });
        }
        if (autoMask) {
          redacted = redacted.replace(new RegExp(rule.regexStr, 'g'), () => {
            if (rule.category === 'PII') return '[MASKED_PII]';
            if (rule.category === 'Financial') return '[MASKED_FINANCIAL]';
            if (rule.category === 'Creds') return '[REDACTED_CREDENTIAL]';
            return '[REDACTED]';
          });
        }
      } catch { }
    });
    return { findings, sanitized: redacted };
  };

  const handleQuickScan = () => {
    if (!pastedText.trim()) return;
    onAddLog('info', 'Started quick paste scan');
    const { findings, sanitized } = executeScan(pastedText);
    setDetectedLeaks(findings);
    setSanitizedPreview(sanitized);
    setScanCompleted(true);
    if (findings.length > 0) {
      const distinct = Array.from(new Set(findings.map(f => f.patternName)));
      const groupedAlerts: Omit<SecurityAlert, 'id' | 'timestamp'>[] = distinct.map(name => {
        const hits = findings.filter(f => f.patternName === name);
        return { fileName: 'Pasted Text Snippet', patternName: name, severity: hits[0].severity as any, hits: hits.length, status: 'Unresolved', channel: 'Direct Paste Console', snippet: hits.slice(0, 3).map(h => h.match).join(', ') };
      });
      onQuickPasteScan(findings.length, groupedAlerts);
      onAddLog('error', `Quick scan: ${findings.length} leak matches found`, `Created ${groupedAlerts.length} threat alerts.`);
    } else {
      onQuickPasteScan(0, []);
      onAddLog('success', 'Quick scan complete — zero leaks detected.', 'No active signatures matched.');
    }
  };

  const runPlaybookScan = (fileName: string, size: string, content: string) => {
    onAddLog('info', `Simulating scan: ${fileName} (${size})`);
    const { findings } = executeScan(content);
    const distinct = Array.from(new Set(findings.map(f => f.patternName)));
    const alerts: Omit<SecurityAlert, 'id' | 'timestamp'>[] = distinct.map(name => {
      const hits = findings.filter(f => f.patternName === name);
      return { fileName, patternName: name, severity: hits[0].severity as any, hits: hits.length, status: 'Unresolved', channel: 'Drag & Drop Agent', snippet: hits.slice(0, 4).map(h => h.match).join(', ') };
    });
    onTriggerScan(fileName, size, findings.length, alerts);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const sizeStr = file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)}MB` : `${(file.size / 1024).toFixed(1)}KB`;
    const reader = new FileReader();
    reader.onload = ev => runPlaybookScan(file.name, sizeStr, (ev.target?.result as string) || '');
    reader.readAsText(file);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeStr = file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)}MB` : `${(file.size / 1024).toFixed(1)}KB`;
    const reader = new FileReader();
    reader.onload = ev => runPlaybookScan(file.name, sizeStr, (ev.target?.result as string) || '');
    reader.readAsText(file);
  };

  const PLAYBOOKS = [
    { name: 'client_export.csv', size: '14.2KB', desc: 'PII / Email / Card leaks', content: 'Email,Card\nalbert@princeton.edu,4111222233334444\nnewton@gravity.org,5234551122334455' },
    { name: 'staging_keys.env', size: '1.4KB', desc: 'API Key leak', content: 'STRIPE_KEY=sk_test_51MzZ7sH2A8B9C1D2\nAWS_SECRET=api:=xV87AHfS7fhas8fh1f893' },
    { name: 'annual_report_clean.txt', size: '22KB', desc: 'Zero leak document', content: 'All global nodes verified secure for Q2 2026. Data classification systems functioning within normal limits.' },
  ];

  return (
    <div className="space-y-6 pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Upload & Paste */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`bento-card rounded-xl p-8 flex flex-col items-center justify-center min-h-[280px] border-2 border-dashed transition-all overflow-hidden ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-primary/30 hover:border-primary'}`}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <CloudUpload className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Upload &amp; Scan</h2>
            <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed text-center">
              Drag and drop files to detect PII, credentials, and sensitive patterns.
            </p>
            <div className="flex gap-3">
              <input type="file" ref={fileInputRef} onChange={handleManualUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all cursor-pointer">
                <Paperclip className="h-3.5 w-3.5" /> Choose Files
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="border border-border text-primary px-5 py-2 rounded-lg text-xs font-semibold hover:bg-primary/5 transition-all cursor-pointer">
                Browse Folders
              </button>
            </div>
            <p className="mt-4 text-[10px] font-mono text-muted-foreground">Supported: PDF, XLSX, CSV, PNG, TXT, LOG (Max 50MB)</p>
          </div>

          {/* Playbook Scenarios */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono mb-3">Playbook Simulation Sandbox</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLAYBOOKS.map(s => (
                <button key={s.name} onClick={() => runPlaybookScan(s.name, s.size, s.content)}
                  className="flex flex-col text-left p-3.5 rounded-lg border border-border hover:border-primary hover:bg-muted transition-all group cursor-pointer">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-primary truncate">{s.name}</span>
                    <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s.size}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Paste Text */}
          <div className="bento-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Paste Text</h3>
              </div>
              <button onClick={() => { setPastedText(''); setScanCompleted(false); setDetectedLeaks([]); setSanitizedPreview(''); }}
                className="text-xs font-bold text-primary hover:underline cursor-pointer">Clear Area</button>
            </div>

            <textarea value={pastedText} onChange={e => setPastedText(e.target.value)}
              className="w-full h-36 bg-muted border border-border rounded-lg p-3 text-xs font-mono focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none"
              placeholder="Paste logs, code snippets, or raw database outputs here..." />

            <div className="mt-3 flex justify-end">
              <button onClick={handleQuickScan} disabled={!pastedText.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer">
                <Play className="h-3.5 w-3.5 fill-current" /> Quick Scan
              </button>
            </div>

            {scanCompleted && (
              <div className="mt-5 border-t border-border pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {detectedLeaks.length > 0
                      ? <AlertTriangle className="h-4 w-4 text-destructive animate-bounce" />
                      : <ShieldCheck className="h-4 w-4 text-green-600" />}
                    <span className="text-xs font-bold text-foreground">
                      {detectedLeaks.length > 0 ? `${detectedLeaks.length} Matches Found!` : 'Clean — Zero Leaks Detected'}
                    </span>
                  </div>
                  {detectedLeaks.length > 0 && (
                    <button onClick={() => setShowSanitized(!showSanitized)}
                      className="text-xs font-bold text-blue-600 flex items-center gap-1.5 hover:underline cursor-pointer">
                      {showSanitized ? <><EyeOff className="h-3.5 w-3.5" /> Show raw</> : <><Eye className="h-3.5 w-3.5" /> Show masked</>}
                    </button>
                  )}
                </div>

                {detectedLeaks.length > 0 ? (
                  <div className="p-3 bg-muted rounded-lg border border-border space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground font-mono uppercase tracking-widest">
                      {showSanitized ? 'REDACTED PREVIEW' : 'PLAINTEXT RAW'}
                    </p>
                    <pre className="text-xs font-mono whitespace-pre-wrap select-text bg-card p-2.5 rounded border border-border max-h-40 overflow-y-auto">
                      {showSanitized ? sanitizedPreview : pastedText}
                    </pre>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {detectedLeaks.slice(0, 8).map((leak, idx) => (
                        <div key={idx} className="bg-red-50 text-red-800 border border-red-200 py-1 px-2.5 rounded-md text-[10px] font-mono flex items-center gap-1.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                          <span className="font-bold">{leak.patternName}:</span>
                          <span className="text-xs select-all bg-white">{leak.match}</span>
                        </div>
                      ))}
                      {detectedLeaks.length > 8 && (
                        <div className="bg-muted text-muted-foreground py-1 px-2 rounded text-[10px] font-mono">+{detectedLeaks.length - 8} more</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-green-800 text-xs">
                    Secure check complete! Zero hits discovered. Safe for transfer.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Sanitization Config */}
          <div className="bento-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Lock className="h-5 w-5 text-orange-500" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Sanitization Rules</h3>
            </div>

            <div className="flex items-start justify-between gap-3 p-3 bg-muted rounded-lg mb-4">
              <div>
                <span className="text-xs font-bold text-foreground block">Auto-mask sensitive data</span>
                <span className="text-[10px] text-muted-foreground">Before exporting to logs</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input type="checkbox" checked={autoMask} onChange={() => setAutoMask(!autoMask)} className="sr-only peer" />
                <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            <div className="space-y-3 border-b border-border pb-4 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Scan Intensity</span>
                <button onClick={handleDepthCycle} className="font-bold text-primary hover:underline cursor-pointer">{scanDepth} (Cycle)</button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Report Retention</span>
                <span className="font-bold text-primary">30 Days</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest font-mono">Active Rules ({patterns.filter(p => p.enabled).length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {patterns.filter(p => p.enabled).map(p => (
                  <span key={p.id} className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-[9px] rounded-md font-bold">{p.category}: {p.name}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Enterprise Vault */}
          <div className="bento-card rounded-xl overflow-hidden shadow-sm">
            <div className="h-32 bg-primary relative p-5 flex flex-col justify-end text-primary-foreground">
              <div className="absolute top-4 right-4 bg-white/10 p-2 rounded-full">
                <Database className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold mb-0.5">Enterprise Vault</h4>
              <p className="text-[10px] text-white/80 font-mono">Connected encrypted nodes S3 / Azure</p>
            </div>
            <div className="p-4 bg-card">
              <button onClick={() => onAddLog('info', 'Querying remote storage logs from Enterprise Vault')}
                className="w-full py-2 border border-border text-foreground font-semibold text-xs rounded-lg hover:bg-muted transition-all cursor-pointer">
                Manage Remote Vaults
              </button>
            </div>
          </div>
        </aside>

        {/* Scans Section */}
        <section className="col-span-1 border-t border-border pt-6 lg:col-span-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-foreground">Ongoing &amp; Recent Scans</h3>
            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100/50 px-2.5 py-1 rounded">SCHEDULER: ONLINE</span>
          </div>

          {scans.length === 0 ? (
            <div className="text-center py-8 bg-card border border-border rounded-xl">
              <p className="text-xs text-muted-foreground font-mono">No active scans. Upload a file or run a playbook scenario above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scans.map(scan => (
                <div key={scan.id} className={`bento-card p-4 rounded-xl flex flex-col gap-3 ${
                  scan.status === 'alert' ? 'border-destructive/40 bg-red-50/10'
                    : scan.status === 'ongoing' ? 'border-primary/40' : 'border-border'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className={`h-4 w-4 shrink-0 ${scan.status === 'alert' ? 'text-destructive' : scan.status === 'ongoing' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs font-bold text-foreground truncate">{scan.fileName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">{scan.size}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{scan.status === 'ongoing' ? 'Scanning...' : scan.status === 'alert' ? 'Alert triggered' : 'Complete'}</span>
                      <span>{scan.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${scan.status === 'alert' ? 'bg-destructive' : scan.status === 'ongoing' ? 'bg-primary' : 'bg-green-500'}`}
                        style={{ width: `${scan.progress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold ${scan.threatsFound > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {scan.threatsFound > 0 ? `${scan.threatsFound} threats` : 'No threats'}
                    </span>
                    {scan.status === 'ongoing' && (
                      <button onClick={() => onCancelScan(scan.id)}
                        className="text-[10px] font-bold text-muted-foreground hover:text-destructive cursor-pointer flex items-center gap-1">
                        <Trash2 className="h-3 w-3" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
