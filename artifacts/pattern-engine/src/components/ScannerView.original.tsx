import React, { useState, useRef } from 'react';
import { 
  CloudUpload, 
  Paperclip, 
  Terminal, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Play, 
  Trash2,
  Lock,
  Compass,
  ArrowRight,
  Database,
  RefreshCw,
  MoreHorizontal
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

export default function ScannerView({
  patterns,
  scans,
  onTriggerScan,
  onQuickPasteScan,
  onAddLog,
  onCancelScan
}: ScannerViewProps) {
  const [pastedText, setPastedText] = useState('');
  const [autoMask, setAutoMask] = useState(true);
  const [scanDepth, setScanDepth] = useState<'Standard' | 'Deep' | 'Paranoid'>('Deep');
  const [retentionDays] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  
  // Quick paste results states
  const [scanCompleted, setScanCompleted] = useState(false);
  const [detectedLeaks, setDetectedLeaks] = useState<Array<{ patternName: string; match: string; index: number; severity: string }>>([]);
  const [sanitizedPreview, setSanitizedPreview] = useState('');
  const [showSanitized, setShowSanitized] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycle scan depths
  const handleDepthCycle = () => {
    if (scanDepth === 'Standard') setScanDepth('Deep');
    else if (scanDepth === 'Deep') setScanDepth('Paranoid');
    else setScanDepth('Standard');
    onAddLog('info', `Configured network scan depth to ${scanDepth === 'Standard' ? 'Deep' : scanDepth === 'Deep' ? 'Paranoid' : 'Standard'}`);
  };

  // Perform a full regex scan over arbitary string
  const executeScan = (textToScan: string, sourceName: string) => {
    if (!textToScan.trim()) return { matches: [], sanitized: '' };

    const activeRules = patterns.filter(p => p.enabled);
    const findings: Array<{ patternName: string; match: string; index: number; severity: string }> = [];
    let redactingText = textToScan;

    activeRules.forEach(rule => {
      try {
        // Build actual RegExp
        const regex = new RegExp(rule.regexStr, 'g');
        let match;
        
        // Loop finding all occurrences
        while ((match = regex.exec(textToScan)) !== null) {
          findings.push({
            patternName: rule.name,
            match: match[0],
            index: match.index,
            severity: rule.severity
          });
        }

        // Masking logic
        if (autoMask) {
          redactingText = redactingText.replace(regex, (m) => {
            if (rule.category === 'PII') return `[MASKED_PII_DATA]`;
            if (rule.category === 'Financial') return `[MASKED_FINANCIAL_RECORD]`;
            if (rule.category === 'Creds') return `[SECURE_CREDENTIAL_SHIELD_REDACTED]`;
            return `[REDACTED_SENSITIVE_DATA]`;
          });
        }
      } catch (e) {
        console.error('Error compiling regex rule', rule.name, e);
      }
    });

    return {
      findings,
      sanitized: redactingText
    };
  };

  // Trigger scanning past text
  const handleQuickScan = () => {
    if (!pastedText.trim()) return;
    
    onAddLog('info', 'Started quick paste scan transaction');
    const { findings, sanitized } = executeScan(pastedText, 'Pasted Text');
    
    setDetectedLeaks(findings);
    setSanitizedPreview(sanitized);
    setScanCompleted(true);

    // Group findings by pattern name to convert them to system alerts if appropriate
    if (findings.length > 0) {
      const groupedAlerts: Omit<SecurityAlert, 'id' | 'timestamp'>[] = [];
      const distinctPatterns = Array.from(new Set(findings.map(f => f.patternName)));

      distinctPatterns.forEach(patName => {
        const matchesOfThisType = findings.filter(f => f.patternName === patName);
        const refFinding = matchesOfThisType[0];
        
        groupedAlerts.push({
          fileName: 'Pasted Text Snippet',
          patternName: patName,
          severity: refFinding.severity as any,
          hits: matchesOfThisType.length,
          status: 'Unresolved',
          channel: 'Direct Paste Console',
          snippet: matchesOfThisType.slice(0, 3).map(m => m.match).join(', ')
        });
      });

      onQuickPasteScan(findings.length, groupedAlerts);
      onAddLog('error', `Quick scan completed with ${findings.length} leak matches detected`, `Created ${groupedAlerts.length} high priority threat alerts.`);
    } else {
      onQuickPasteScan(0, []);
      onAddLog('success', 'Quick scan completed. Zero leak patterns intercepted.', 'No active signatures matched.');
    }
  };

  // Clear past scan text
  const handleClearPaste = () => {
    setPastedText('');
    setScanCompleted(false);
    setDetectedLeaks([]);
    setSanitizedPreview('');
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Execute mock playbook files
  const runPlaybookScan = (fileName: string, size: string, content: string) => {
    onAddLog('info', `Simulating analysis drop: ${fileName} (${size})`);
    
    const { findings } = executeScan(content, fileName);
    
    // Group findings by pattern name
    const groupedAlerts: Omit<SecurityAlert, 'id' | 'timestamp'>[] = [];
    const distinctPatterns = Array.from(new Set(findings.map(f => f.patternName)));

    distinctPatterns.forEach(patName => {
      const matchesOfThisType = findings.filter(f => f.patternName === patName);
      const refFinding = matchesOfThisType[0];
      
      groupedAlerts.push({
        fileName: fileName,
        patternName: patName,
        severity: refFinding.severity as any,
        hits: matchesOfThisType.length,
        status: 'Unresolved',
        channel: 'Drag & Drop Agent',
        snippet: matchesOfThisType.slice(0, 4).map(m => m.match).join(', ')
      });
    });

    onTriggerScan(fileName, size, findings.length, groupedAlerts);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const fileSizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)}MB`
        : `${(file.size / 1024).toFixed(1)}KB`;
      
      // Simulate file reading content to search for patterns
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        runPlaybookScan(file.name, fileSizeStr, text);
      };
      reader.readAsText(file);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileSizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)}MB`
        : `${(file.size / 1024).toFixed(1)}KB`;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        runPlaybookScan(file.name, fileSizeStr, text);
      };
      reader.readAsText(file);
    }
  };

  // Seed playbook scenarios
  const PLAYBOOKS = [
    {
      name: 'client_export.csv',
      size: '14.2KB',
      desc: 'PII / Email / Card leaks',
      content: 'Email,Secondary,Card,Country\nalbert@princeton.edu,albert.einstein@gmail.com,4111222233334444,US\nnewton@gravity.org,,5234551122334455,UK\ncurie@radium.fr,marie@curie.org,123-abc-456,FR'
    },
    {
      name: 'staging_keys.env',
      size: '1.4KB',
      desc: 'API Key leak',
      content: '## STAGING PORT PORTS ENVIRONMENT\nNODE_ENV="staging"\nSTRIPE_STAGING_KEY=sk_test_51MzZ7sH2A8B9C1D2\nAWS_SECRET_KEY="api:=xV87AHfS7fhas8fh1f893asfasfhas89fhas8f"\nPUBLIC_RECAPTCHA="6Ld2874asfhas7f"'
    },
    {
      name: 'annual_report_clean.txt',
      size: '22KB',
      desc: 'Zero leak document',
      content: 'All global nodes verified secure for Q2 2026. Data classification systems functioning inside default limits. Security and legal protocols maintained.'
    }
  ];

  return (
    <div className="space-y-6 pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left main area: Upload & Paste Scanner */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Draggable File Uploader Card */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bento-card rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] border-dashed border-2 transition-all relative overflow-hidden bg-white ${
              isDragging 
                ? 'border-primary bg-blue-50/50 scale-[1.01]' 
                : 'border-primary/30 hover:border-primary'
            }`}
          >
            <div className="z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-4 text-primary">
                <CloudUpload className="h-10 w-10" />
              </div>
              <h2 className="text-lg font-bold text-on-surface mb-1 font-sans">Upload &amp; Scan</h2>
              <p className="text-xs text-on-surface-variant max-w-sm mb-6 leading-relaxed font-sans">
                Drag and drop sensitive files here to detect patterns like PII, credentials, or proprietary source code.
              </p>
              
              <div className="flex gap-3">
                <input 
                  type="file"
                  id="scanner-upload-picker"
                  ref={fileInputRef}
                  onChange={handleManualUpload}
                  className="hidden"
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary hover:bg-primary/95 text-white px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Choose Files
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-outline-variant text-primary px-5 py-2 rounded-lg text-xs font-semibold hover:bg-primary/5 transition-all cursor-pointer"
                >
                  Browse Folders
                </button>
              </div>
              
              <p className="mt-4 text-[10px] font-mono text-outline">
                Supported: PDF, XLSX, CSV, PNG, TXT, LOG (Max 50MB)
              </p>
            </div>
          </div>

          {/* PLAYBOOK SCENARIOS */}
          <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest font-mono mb-3">
              Playbook Simulation sandbox (Click to Hot-Scan)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLAYBOOKS.map((scenario) => (
                <button
                  key={scenario.name}
                  onClick={() => runPlaybookScan(scenario.name, scenario.size, scenario.content)}
                  className="flex flex-col text-left p-3.5 rounded-lg border border-outline-variant hover:border-primary hover:bg-slate-50 transition-all group shrink-0 select-none cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 justify-between w-full">
                    <span className="text-xs font-bold text-primary truncate">{scenario.name}</span>
                    <span className="text-[9px] font-mono bg-surface-container px-1.5 py-0.5 rounded text-outline">{scenario.size}</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-2 font-sans">{scenario.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Paste Text Card */}
          <div className="bento-card rounded-xl p-5 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-sm font-bold text-on-surface font-sans">Paste Text</h3>
              </div>
              <button 
                onClick={handleClearPaste}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Clear Area
              </button>
            </div>

            <textarea 
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full h-36 bg-surface border border-outline-variant rounded-lg p-3 text-xs font-mono focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none"
              placeholder="Paste logs, code snippets, or raw database outputs here for instant scanning..."
            />

            <div className="mt-3 flex justify-end">
              <button 
                onClick={handleQuickScan}
                disabled={!pastedText.trim()}
                className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-lg text-xs font-bold font-sans flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Quick Scan
              </button>
            </div>

            {/* Paste Scan Results Segment */}
            {scanCompleted && (
              <div className="mt-5 border-t border-outline-variant pt-4 space-y-3 animate-in slide-in-from-bottom-2 duration-350">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {detectedLeaks.length > 0 ? (
                      <AlertTriangle className="h-4.5 w-4.5 text-error animate-bounce" />
                    ) : (
                      <ShieldCheck className="h-4.5 w-4.5 text-green-600" />
                    )}
                    <span className="text-xs font-bold text-on-surface font-sans">
                      {detectedLeaks.length > 0 
                        ? `${detectedLeaks.length} Signature Matches Found!` 
                        : 'Clean: Zero Data Leaks Detected'}
                    </span>
                  </div>

                  {detectedLeaks.length > 0 && (
                    <button 
                      onClick={() => setShowSanitized(!showSanitized)}
                      className="text-xs font-bold text-secondary flex items-center gap-1.5 hover:underline cursor-pointer"
                    >
                      {showSanitized ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showSanitized ? 'Show raw' : 'Show masked preview'}
                    </button>
                  )}
                </div>

                {/* Leak highlight view */}
                {detectedLeaks.length > 0 ? (
                  <div className="p-3 bg-surface-container rounded-lg border border-outline-variant space-y-2">
                    <p className="text-[10px] font-bold text-outline font-mono uppercase tracking-widest">
                      {showSanitized ? 'REDACTED PREVIEW DISPLAY' : 'PLAINTEXT RAW IDENTIFIES'}
                    </p>
                    <pre className="text-xs font-mono whitespace-pre-wrap select-text bg-white p-2.5 rounded border border-outline-variant max-h-40 overflow-y-auto">
                      {showSanitized ? sanitizedPreview : pastedText}
                    </pre>

                    {/* Findings list */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {detectedLeaks.slice(0, 8).map((leak, idx) => (
                        <div key={idx} className="bg-red-50 text-red-800 border border-red-200 py-1 px-2.5 rounded-md text-[10px] font-mono flex items-center gap-1.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                          <span className="font-bold">{leak.patternName}:</span>
                          <span className="text-xs select-all bg-white">{leak.match}</span>
                        </div>
                      ))}
                      {detectedLeaks.length > 8 && (
                        <div className="bg-surface-container-high text-on-surface-variant py-1 px-2 rounded text-[10px] font-mono">
                          + {detectedLeaks.length - 8} more matches
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-100/50 p-4 rounded-lg border border-green-200 text-green-800 text-xs font-sans">
                    Secure check completes! All text parsed matching active rules, zero hits discovered. Safe for transfer.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Controls column */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Sanitization Config */}
          <div className="bento-card rounded-xl p-5 bg-white shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-tertiary-container/10 rounded-lg">
                <Lock className="h-5 w-5 text-tertiary-container text-orange-500" />
              </div>
              <h3 className="text-sm font-bold text-on-surface font-sans">Sanitization Rules</h3>
            </div>

            {/* Toggle mask switch */}
            <div className="flex items-start justify-between gap-3 p-3 bg-surface rounded-lg mb-4">
              <div>
                <span className="text-xs font-bold text-on-surface font-sans block">Auto-mask sensitive data</span>
                <span className="text-[10px] text-on-surface-variant font-sans">Before exporting to logs / previews</span>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input 
                  type="checkbox" 
                  checked={autoMask}
                  onChange={() => setAutoMask(!autoMask)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            <div className="space-y-3 border-b border-outline-variant pb-4 mb-4">
              {/* Scan depth picker */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface-variant font-sans">Scan Intensity</span>
                <button 
                  onClick={handleDepthCycle}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  {scanDepth} (Cycle)
                </button>
              </div>

              {/* Retention */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface-variant font-sans">Report Retention</span>
                <span className="font-bold text-primary">{retentionDays} Days</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-on-surface uppercase tracking-widest font-mono">
                Active Rule Sets ({patterns.filter(p => p.enabled).length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {patterns.filter(p => p.enabled).map(p => (
                  <span key={p.id} className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-[9px] rounded-md font-bold">
                    {p.category}: {p.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Enterprise Vault status */}
          <div className="bento-card rounded-xl overflow-hidden group shadow-xs">
            <div className="h-32 bg-primary relative p-5 flex flex-col justify-end text-white">
              <div className="absolute top-4 right-4 bg-white/10 p-2 rounded-full backdrop-blur-xs">
                <Database className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold mb-0.5 font-sans">Enterprise Vault</h4>
              <p className="text-[10px] text-white/80 font-mono">Connected encrypted nodes S3 / Azure</p>
            </div>
            <div className="p-4 bg-white">
              <button 
                onClick={() => onAddLog('info', 'Querying remote storage logs from Enterprise Vault Nodes')}
                className="w-full py-2 border border-outline text-on-surface font-semibold text-xs rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                Manage Remote Vaults
              </button>
            </div>
          </div>
        </aside>

        {/* Ongoing & Recent Scans container */}
        <section className="col-span-1 border-t border-outline-variant pt-6 lg:col-span-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-on-surface font-sans">Ongoing &amp; Recent Scans</h3>
            <span className="text-[10px] font-mono font-bold text-secondary bg-blue-100/50 px-2.5 py-1 rounded">
              SCHEDULER STATUS: ONLINE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scans.map((scan) => (
              <div 
                key={scan.id}
                className={`bento-card p-4 rounded-xl flex flex-col gap-3 bg-white border ${
                  scan.status === 'alert' 
                    ? 'border-error/40 bg-red-50/10' 
                    : scan.status === 'ongoing'
                      ? 'border-primary/40'
                      : 'border-outline-variant'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className={`h-4.5 w-4.5 shrink-0 ${
                      scan.status === 'alert'
                        ? 'text-error'
                        : scan.status === 'ongoing'
                          ? 'text-primary'
                          : 'text-secondary'
                    }`} />
                    <span className="text-xs font-bold text-on-surface truncate font-sans max-w-[150px]">
                      {scan.fileName}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 font-mono text-[9px] font-bold rounded-full ${
                    scan.status === 'alert'
                      ? 'bg-error text-white'
                      : scan.status === 'ongoing'
                        ? 'bg-primary/10 text-primary animate-pulse'
                        : 'bg-green-100 text-green-800'
                  }`}>
                    {scan.status === 'ongoing' ? `${scan.progress}%` : scan.status === 'alert' ? 'ALERT' : 'DONE'}
                  </span>
                </div>

                {/* Progress bar info */}
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      scan.status === 'alert' 
                        ? 'bg-red-600' 
                        : scan.status === 'ongoing'
                          ? 'bg-primary'
                          : 'bg-green-600'
                    }`}
                    style={{ width: `${scan.progress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono pt-1">
                  <span className="text-outline">
                    {scan.size} • {scan.status === 'alert' ? `${scan.threatsFound} matches detected` : scan.timeRemaining}
                  </span>
                  
                  {scan.status === 'ongoing' ? (
                    <button 
                      onClick={() => onCancelScan(scan.id)}
                      className="text-error font-bold hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  ) : scan.status === 'alert' ? (
                    <span className="text-error font-bold font-sans">High Threat</span>
                  ) : (
                    <span className="text-green-700 font-bold font-sans">Secure Checked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

