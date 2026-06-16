import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import LoginView from '@/components/LoginView';
import DashboardView from '@/components/DashboardView';
import AlertsView from '@/components/AlertsView';
import PatternsView from '@/components/PatternsView';
import ScannerView from '@/components/ScannerView';
import LogsView from '@/components/LogsView';
import { Pattern, SecurityAlert, ScanTask, ActivityLog, ViewType } from './types';
import { INITIAL_PATTERNS, INITIAL_ALERTS, INITIAL_SCANS, INITIAL_LOGS } from './defaultData';
import { Shield, Bell, LogOut, LayoutDashboard, ScanLine, ShieldAlert, FileText, Fingerprint } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

interface AuthUser {
  id?: number;
  name: string;
  email: string;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function MainApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [activeView, setActiveView] = useState<ViewType>('Dashboard');
  const [patterns, setPatterns] = useState<Pattern[]>(INITIAL_PATTERNS);
  const [alerts, setAlerts] = useState<SecurityAlert[]>(INITIAL_ALERTS);
  const [scans, setScans] = useState<ScanTask[]>(INITIAL_SCANS);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [filesScannedCount, setFilesScannedCount] = useState(3);

  const addLog = useCallback((level: ActivityLog['level'], message: string, details?: string) => {
    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8);
    setLogs(prev => [{ id: generateId('log'), timestamp, level, message, details }, ...prev]);
  }, []);

  const handleTogglePattern = (id: string) => {
    setPatterns(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    const pat = patterns.find(p => p.id === id);
    if (pat) addLog('info', `Pattern "${pat.name}" ${pat.enabled ? 'disabled' : 'enabled'}`);
  };

  const handleAddPattern = (newPattern: Omit<Pattern, 'id' | 'enabled'>) => {
    const pattern: Pattern = { ...newPattern, id: generateId('pat'), enabled: true };
    setPatterns(prev => [...prev, pattern]);
    addLog('success', `New pattern "${newPattern.name}" added to engine`, `Category: ${newPattern.category}, Severity: ${newPattern.severity}`);
  };

  const handleAcknowledgeAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Acknowledged' } : a));
    const alert = alerts.find(a => a.id === id);
    if (alert) addLog('success', `Alert acknowledged: ${alert.fileName}`, `Pattern: ${alert.patternName}`);
  };

  const handleDeleteAlert = (id: string) => {
    const alert = alerts.find(a => a.id === id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    if (alert) addLog('warning', `Alert deleted: ${alert.fileName}`);
  };

  const handleTriggerScan = (fileName: string, size: string, resultsCount: number, detectedAlerts: Omit<SecurityAlert, 'id' | 'timestamp'>[]) => {
    const now = new Date();
    const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    const scanId = generateId('scan');

    setScans(prev => {
      const newScan: ScanTask = {
        id: scanId,
        fileName,
        progress: 100,
        status: resultsCount > 0 ? 'alert' : 'done',
        threatsFound: resultsCount,
        size,
        timeRemaining: resultsCount > 0 ? `${resultsCount} threats` : 'Completed',
      };
      return [newScan, ...prev.filter(s => s.status !== 'ongoing').slice(0, 4)];
    });

    setFilesScannedCount(prev => prev + 1);

    if (detectedAlerts.length > 0) {
      const newAlerts: SecurityAlert[] = detectedAlerts.map(a => ({
        ...a, id: generateId('alert'), timestamp,
      }));
      setAlerts(prev => [...newAlerts, ...prev]);
    }

    const level = resultsCount > 0 ? 'error' : 'success';
    addLog(level, `Scan completed: ${fileName}`, resultsCount > 0 ? `${resultsCount} threats found in ${size} file.` : 'No threats detected. File is clean.');
  };

  const handleQuickPasteScan = (findingsCount: number, alertsList: Omit<SecurityAlert, 'id' | 'timestamp'>[]) => {
    const now = new Date();
    const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    if (alertsList.length > 0) {
      const newAlerts: SecurityAlert[] = alertsList.map(a => ({ ...a, id: generateId('alert'), timestamp }));
      setAlerts(prev => [...newAlerts, ...prev]);
    }
    setFilesScannedCount(prev => prev + 1);
  };

  const handleCancelScan = (id: string) => {
    setScans(prev => prev.map(s => s.id === id ? { ...s, status: 'canceled', timeRemaining: 'Canceled' } : s));
    addLog('warning', `Scan task canceled: ${scans.find(s => s.id === id)?.fileName ?? id}`);
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('info', 'Log console cleared by operator');
  };

  const unresolvedCount = alerts.filter(a => a.status === 'Unresolved').length;

  const navItems: Array<{ view: ViewType; icon: React.FC<{ className?: string }>; label: string }> = [
    { view: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { view: 'Patterns', icon: Fingerprint, label: 'Patterns' },
    { view: 'Scanner', icon: ScanLine, label: 'Scanner' },
    { view: 'Alerts', icon: ShieldAlert, label: 'Alerts' },
    { view: 'Logs', icon: FileText, label: 'Logs' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground tracking-tight">Data Leak Tracker</div>
              <div className="text-[10px] text-muted-foreground font-mono hidden sm:block">Pattern Engine v3.0</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer">
              <Bell className="h-4.5 w-4.5 h-5 w-5" />
              {unresolvedCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {unresolvedCount > 9 ? '9+' : unresolvedCount}
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[100px] truncate">{user.name}</span>
            </div>

            <button onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-14 pb-20">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {activeView === 'Dashboard' && (
            <DashboardView
              filesScannedCount={filesScannedCount}
              alerts={alerts}
              patterns={patterns}
              logs={logs}
              onViewChange={setActiveView}
            />
          )}
          {activeView === 'Patterns' && (
            <PatternsView
              patterns={patterns}
              onTogglePattern={handleTogglePattern}
              onAddPattern={handleAddPattern}
              velocity={`${alerts.filter(a => a.status === 'Unresolved').length} alerts`}
              health="GOOD"
            />
          )}
          {activeView === 'Scanner' && (
            <ScannerView
              patterns={patterns}
              scans={scans}
              onTriggerScan={handleTriggerScan}
              onQuickPasteScan={handleQuickPasteScan}
              onAddLog={addLog}
              onCancelScan={handleCancelScan}
            />
          )}
          {activeView === 'Alerts' && (
            <AlertsView
              alerts={alerts}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onDeleteAlert={handleDeleteAlert}
            />
          )}
          {activeView === 'Logs' && (
            <LogsView
              logs={logs}
              onClearLogs={handleClearLogs}
              onAddLog={addLog}
            />
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
        <div className="max-w-6xl mx-auto px-2 h-16 flex items-center justify-around">
          {navItems.map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer min-w-0 flex-1 ${
                activeView === view
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {view === 'Alerts' && unresolvedCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-600 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                    {unresolvedCount > 9 ? '9+' : unresolvedCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold truncate">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('auth_user');
    return !!(token && user);
  });

  const [user, setUser] = useState<AuthUser>(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : { name: 'Operator', email: '' };
    } catch {
      return { name: 'Operator', email: '' };
    }
  });

  const handleLoginSuccess = (token: string, userData: AuthUser) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
    setUser({ name: 'Operator', email: '' });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isAuthenticated ? (
          <MainApp user={user} onLogout={handleLogout} />
        ) : (
          <LoginView onLoginSuccess={handleLoginSuccess} />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
