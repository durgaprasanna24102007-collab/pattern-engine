import { useState } from 'react';
import { 
  FileClock, 
  Terminal, 
  Search, 
  Download, 
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { ActivityLog } from '../types';

interface LogsViewProps {
  logs: ActivityLog[];
  onClearLogs: () => void;
  onAddLog: (level: ActivityLog['level'], message: string, details?: string) => void;
}

export default function LogsView({
  logs,
  onClearLogs,
  onAddLog
}: LogsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ActivityLog['level'] | 'all'>('all');

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const getLogLevelIcon = (level: ActivityLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogLevelClass = (level: ActivityLog['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-700 bg-green-50/50 border-green-200';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50/50 border-yellow-250';
      case 'error':
        return 'text-red-700 bg-red-50/50 border-red-200';
      default:
        return 'text-blue-700 bg-blue-50/50 border-blue-200';
    }
  };

  const handleExportLogs = () => {
    const rawData = JSON.stringify(logs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(rawData);
    
    // Create discrete download node
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `dlp_telemetry_logs_${Date.now()}.json`;
    link.click();
    
    onAddLog('success', 'Successfully exported system logs workspace', `Generated JSON bundle size of ${rawData.length} bytes.`);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Search & Level Filters */}
      <div className="bg-white border border-outline-variant rounded-xl p-4 space-y-3 shadow-xs">
        {/* Row 1: Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline h-4 w-4" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none text-xs font-sans"
            placeholder="Search telemetry traces, file names, or errors..."
          />
        </div>

        {/* Row 2: Level buttons & Export/Clear Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button 
              onClick={() => setSelectedLevel('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                selectedLevel === 'all' 
                  ? 'bg-outline text-white' 
                  : 'bg-surface hover:bg-surface-container-high border border-outline-variant'
              }`}
            >
              ALL
            </button>
            <button 
              onClick={() => setSelectedLevel('info')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                selectedLevel === 'info' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-surface hover:bg-blue-50/50 border border-outline-variant text-blue-700'
              }`}
            >
              INFO
            </button>
            <button 
              onClick={() => setSelectedLevel('success')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                selectedLevel === 'success' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-surface hover:bg-green-50/50 border border-outline-variant text-green-700'
              }`}
            >
              SUCCESS
            </button>
            <button 
              onClick={() => setSelectedLevel('warning')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                selectedLevel === 'warning' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-surface hover:bg-yellow-50/50 border border-outline-variant text-yellow-700 font-bold'
              }`}
            >
              WARN
            </button>
            <button 
              onClick={() => setSelectedLevel('error')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                selectedLevel === 'error' 
                  ? 'bg-red-650 bg-red-600 text-white' 
                  : 'bg-surface hover:bg-red-50/50 border border-outline-variant text-red-700 font-bold'
              }`}
            >
              ERROR
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button 
              onClick={handleExportLogs}
              title="Export Log Workspace"
              className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button 
              onClick={onClearLogs}
              title="Clear Console Memory"
              className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Console Feed Logs */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary shrink-0" />
            <h4 className="text-xs font-bold font-mono text-on-surface uppercase tracking-wider">
              DLP Engine Console Logs ({filteredLogs.length} traces)
            </h4>
          </div>
          <span className="text-[10px] font-mono font-medium text-outline">
            MODE: LOCAL_STATE_STREAM
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <FileClock className="h-10 w-10 text-outline mx-auto mb-2 opacity-50" />
            <p className="text-xs font-mono text-on-surface-variant">Console memory empty or matching filters.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
            {filteredLogs.map((log) => (
              <div 
                key={log.id}
                className="flex items-start gap-3 border-b border-surface-container pb-3 text-xs last:border-b-0 animate-in fade-in-50 duration-200"
              >
                {/* Level icon */}
                <span className="shrink-0 mt-0.5">
                  {getLogLevelIcon(log.level)}
                </span>

                {/* Log Details core */}
                <div className="flex-1 min-w-0 font-mono space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-on-surface leading-normal text-xs font-semibold truncate">
                      {log.message}
                    </p>
                    <time className="text-[10px] text-outline tracking-tight shrink-0">
                      [{log.timestamp}]
                    </time>
                  </div>
                  
                  {log.details && (
                    <p className="text-[10px] text-on-surface-variant leading-relaxed select-text bg-surface-container-low/75 p-2 rounded border border-surface-container-high">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

