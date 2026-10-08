import { AppProvider, useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import KpiCards from '@/components/KpiCards';
import OrbitalVisualization from '@/components/OrbitalVisualization';
import ConjunctionsTable from '@/components/ConjunctionsTable';
import RiskAssessmentCard from '@/components/RiskAssessmentCard';
import ManeuverPlannerCard from '@/components/ManeuverPlannerCard';
import ConjunctionMonitorView from '@/components/views/ConjunctionMonitorView';
import RiskAssessmentView from '@/components/views/RiskAssessmentView';
import ManeuverPlannerView from '@/components/views/ManeuverPlannerView';
import CascadeAnalysisView from '@/components/views/CascadeAnalysisView';
import AddSatelliteModal from '@/components/AddSatelliteModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

function Dashboard() {
  const { activeNav, isLoading, error, refreshData } = useApp();

  return (
    <div className="h-screen flex flex-col bg-space-950 overflow-hidden font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col p-4 overflow-hidden min-w-0">
          {/* Notification / Loading / Error Banner */}
          {isLoading && (
            <div className="glass-panel p-2.5 mb-3 flex items-center justify-between text-xs font-mono text-accent-cyan border-accent-cyan/20">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="uppercase tracking-widest">
                  Propagating CelesTrak Orbital Telemetry via SGP4 Model...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="glass-panel p-2.5 mb-3 flex items-center justify-between text-xs font-mono text-accent-amber border-accent-amber/30 bg-accent-amber/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-accent-amber shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => void refreshData()}
                className="underline hover:text-white transition-colors"
              >
                Retry Live Connect
              </button>
            </div>
          )}

          {/* Conditional View Rendering based on activeNav */}
          {activeNav === 'overview' && (
            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
              {/* Left / Center: KPIs + 3D Orbital Canvas + Table */}
              <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
                <KpiCards />

                <div className="flex-1 min-h-[340px]">
                  <OrbitalVisualization />
                </div>

                <div className="h-[250px] shrink-0">
                  <ConjunctionsTable />
                </div>
              </div>

              {/* Right: Risk Assessment Card + Maneuver Planner Card */}
              <div className="w-[360px] shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
                <RiskAssessmentCard />
                <ManeuverPlannerCard />
              </div>
            </div>
          )}

          {activeNav === 'conjunction' && <ConjunctionMonitorView />}
          {activeNav === 'risk' && <RiskAssessmentView />}
          {activeNav === 'maneuver' && <ManeuverPlannerView />}
          {activeNav === 'cascade' && <CascadeAnalysisView />}
        </main>
      </div>

      {/* Global Modals */}
      <AddSatelliteModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  );
}
