'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  RefreshCw, 
  Terminal, 
  Activity, 
  Layers, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Bot, 
  Database,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import VoxelBadge from '@/components/VoxelBadge';
import VoxelButton from '@/components/VoxelButton';
import VoxelThemeToggle from '@/components/VoxelThemeToggle';
import VoxelGraphCanvas from '@/components/VoxelGraphCanvas';
import IncidentCommanderFeed from '@/components/IncidentCommanderFeed';
import CypherConsole from '@/components/CypherConsole';
import UnifiedConsoleDeck from '@/components/UnifiedConsoleDeck';
import KimoChatAssistant from '@/components/KimoChatAssistant';
import FalkorVisualBrowser from '@/components/FalkorVisualBrowser';
import { useTheme } from '@/lib/theme-context';
import { isAudioMuted, toggleAudioMute, playChaosAlarm } from '@/lib/audio';
import { GraphNode, GraphEdge, BlastRadiusReport, FalkorStatusResponse } from '@/lib/types';

export default function IncidentCommanderApp() {
  const router = useRouter();
  const { theme } = useTheme();

  // Access Clearance Gate Check
  const [hasClearance, setHasClearance] = useState<boolean | null>(null);
  const [clearanceInfo, setClearanceInfo] = useState<any>(null);

  // Tactical Audio & Chaos state
  const [muted, setMuted] = useState(false);
  const [isInjectingChaos, setIsInjectingChaos] = useState(false);
  const [chaosAlert, setChaosAlert] = useState<{
    chaosId: string;
    nodesBreached: string[];
    cutVerticesCalculated: string[];
    timeMs: number;
  } | null>(null);
  const [kimoPrompt, setKimoPrompt] = useState<string | null>(null);

  // Graph state
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [falkorStatus, setFalkorStatus] = useState<FalkorStatusResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [blastReport, setBlastReport] = useState<BlastRadiusReport | null>(null);
  const [isLoadingTopology, setIsLoadingTopology] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  // Check Security Clearance on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('blastshield_clearance');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.granted) {
          setHasClearance(true);
          setClearanceInfo(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setHasClearance(false);
  }, []);

  // Fetch real FalkorDB topology & status
  const loadTopology = useCallback(async () => {
    setIsLoadingTopology(true);
    try {
      const [topRes, statRes] = await Promise.all([
        fetch('/api/falkor/topology'),
        fetch('/api/falkor/status')
      ]);

      const topData = await topRes.json();
      const statData = await statRes.json();

      if (topData.success) {
        setNodes(topData.nodes || []);
        setEdges(topData.edges || []);
      }
      setFalkorStatus(statData);
    } catch (err) {
      console.error('Failed to load topology from FalkorDB', err);
    } finally {
      setIsLoadingTopology(false);
    }
  }, []);

  const handleRemediationApplied = () => {
    setBlastReport(null);
    loadTopology();
  };

  useEffect(() => {
    if (!hasClearance) return;
    loadTopology();
    // Auto-sync polling every 8 seconds to ensure live telemetry is always dynamic
    const interval = setInterval(() => {
      loadTopology();
    }, 8000);
    return () => clearInterval(interval);
  }, [hasClearance, loadTopology]);

  // Handle re-seeding the topology in FalkorDB
  const handleResetTopology = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/falkor/seed', { method: 'POST' });
      setBlastReport(null);
      setSelectedNode(null);
      await loadTopology();
    } catch (err) {
      console.error('Failed to reset topology', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleTriggerIncidentOnNode = (node: GraphNode) => {
    fetch('/api/falkor/blast-radius', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceNodeId: node.id,
        incidentCategory: 'IAM_LEAK'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBlastReport(data.report);
          loadTopology();
        }
      });
  };

  // Tactical Audio Sync on mount
  useEffect(() => {
    setMuted(isAudioMuted());
  }, []);

  const handleToggleMute = () => {
    const next = toggleAudioMute();
    setMuted(next);
  };

  const handleInjectChaos = async () => {
    setIsInjectingChaos(true);
    playChaosAlarm();
    try {
      const res = await fetch('/api/falkor/chaos', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.chaosReport) {
        setChaosAlert({
          chaosId: data.chaosReport.chaosId,
          nodesBreached: data.chaosReport.nodesBreached,
          cutVerticesCalculated: data.chaosReport.cutVerticesCalculated,
          timeMs: data.chaosReport.executionTimeMs
        });
        await loadTopology();

        // Auto-select and compute blast radius on first compromised node
        const firstBreachedId = data.chaosReport.nodesBreached[0];
        const targetNode = nodes.find(n => n.id === firstBreachedId) || ({
          id: firstBreachedId,
          name: firstBreachedId,
          type: 'K8sPod',
          tier: 1,
          status: 'COMPROMISED',
          region: 'us-east-1'
        } as unknown as GraphNode);
        setSelectedNode(targetNode);
        handleTriggerIncidentOnNode(targetNode);
      }
    } catch (err) {
      console.error('Chaos injection failed', err);
    } finally {
      setIsInjectingChaos(false);
    }
  };

  const handleExitConsole = () => {
    sessionStorage.removeItem('blastshield_clearance');
    router.push('/');
  };

  // Render Gate Wall if unauthorized
  if (hasClearance === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="voxel-box w-full max-w-md bg-[var(--bg-surface)] p-6 text-center space-y-4 border-4 border-black dark:border-[#ff3366] shadow-[var(--voxel-shadow-lg)]">
          <div className="w-12 h-12 bg-[#ff3366] text-white border-2 border-black mx-auto flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-black text-lg uppercase tracking-wide">
              RESTRICTED CONSOLE ACCESS
            </h2>
            <p className="text-xs font-mono text-[var(--text-secondary)]">
              Direct access is blocked. You must authorize through the Security Access Gate on the homepage.
            </p>
          </div>
          <VoxelButton
            variant="primary"
            size="md"
            onClick={() => router.push('/')}
            className="w-full justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            RETURN TO HOMEPAGE & AUTHORIZE
          </VoxelButton>
        </div>
      </div>
    );
  }

  if (hasClearance === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs font-bold animate-pulse">
          CHECKING SECURITY CLEARANCE PROTOCOLS...
        </div>
      </div>
    );
  }

  // Summary counts
  const healthyCount = nodes.filter(n => n.status === 'HEALTHY').length;
  const compromisedCount = nodes.filter(n => n.status === 'COMPROMISED' || blastReport?.sourceNode.id === n.id).length;
  const atRiskCount = blastReport ? blastReport.impactedNodes.length : 0;
  const quarantinedCount = nodes.filter(n => n.status === 'QUARANTINED').length;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Apple-Level Minimalist FalkorDB Explorer Modal */}
      <FalkorVisualBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        nodes={nodes}
        edges={edges}
        status={falkorStatus}
        onSelectNode={(node) => setSelectedNode(node)}
        onRefresh={loadTopology}
      />

      {/* Top Console Bar */}
      <header className="border-b-3 border-[var(--border-color)] bg-[var(--bg-surface)] px-4 md:px-8 py-3 sticky top-0 z-30 shadow-[var(--voxel-shadow)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00FF66] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <ShieldAlert className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm md:text-base tracking-wider">
                  BLASTSHIELD<span className="text-[#00FF66]">.COMMANDER</span>
                </span>
                <VoxelBadge status="CLEARANCE: AUTHORIZED" size="sm" />
              </div>
              <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                SESSION: {clearanceInfo?.mode || 'AUTHORIZED'} | HOST: 127.0.0.1:6379
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click Multi-Vector Zero-Trust Chaos Cascade */}
            <VoxelButton
              variant="danger"
              size="sm"
              onClick={handleInjectChaos}
              disabled={isInjectingChaos}
              className="gap-1.5 bg-[#ff3366] text-white hover:bg-[#e02855] border-2 border-black"
            >
              <Flame className={`w-3.5 h-3.5 ${isInjectingChaos ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isInjectingChaos ? 'INJECTING...' : 'INJECT CHAOS'}</span>
            </VoxelButton>

            {/* Tactical Audio Toggle */}
            <VoxelButton
              variant="secondary"
              size="sm"
              onClick={handleToggleMute}
              className="gap-1.5"
              title={muted ? 'Tactical Audio Muted' : 'Tactical Audio Active'}
            >
              {muted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[#ff3366]" />
                  <span className="hidden md:inline text-[10px]">MUTED</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#00FF66]" />
                  <span className="hidden md:inline text-[10px]">SOUND: ON</span>
                </>
              )}
            </VoxelButton>

            {/* Open Apple-Level Minimalist FalkorDB Explorer */}
            <VoxelButton
              variant="secondary"
              size="sm"
              onClick={() => setIsBrowserOpen(true)}
              className="gap-1.5"
            >
              <Database className="w-3.5 h-3.5 text-[#00FF66]" />
              <span className="hidden sm:inline">EXPLORER</span>
            </VoxelButton>

            <VoxelButton
              variant="secondary"
              size="sm"
              onClick={handleResetTopology}
              disabled={isResetting}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isResetting ? 'RESETTING...' : 'RESET GRAPH'}</span>
            </VoxelButton>

            <VoxelThemeToggle />

            <VoxelButton
              variant="outline"
              size="sm"
              onClick={handleExitConsole}
              className="gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EXIT</span>
            </VoxelButton>
          </div>
        </div>
      </header>

      {/* Main Console Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6">
        {/* Real-time Multi-Vector Chaos Alert Banner */}
        {chaosAlert && (
          <div className="voxel-box bg-[#ff3366]/10 border-3 border-[#ff3366] p-4 text-[var(--text-primary)] space-y-3 animate-pulse shadow-[var(--voxel-shadow-lg)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#ff3366] text-white flex items-center justify-center font-black">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-[#ff3366] uppercase tracking-wider flex items-center gap-2">
                    MULTI-VECTOR ZERO-TRUST CHAOS INJECTION: {chaosAlert.chaosId}
                  </h4>
                  <p className="text-xs font-mono text-[var(--text-secondary)]">
                    Live multi-tier incident recorded across {chaosAlert.nodesBreached.length} nodes. FalkorDB traversal and cut analysis completed in {chaosAlert.timeMs}ms.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChaosAlert(null)}
                className="p-1 hover:bg-[#ff3366]/20 text-[var(--text-secondary)] hover:text-[#ff3366]"
                title="Dismiss Banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-black/20 border border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Breached Nodes:</span>
                <span className="text-[#ff3366] font-bold">{chaosAlert.nodesBreached.join(', ')}</span>
              </div>
              <div className="p-2 bg-black/20 border border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Live Graph Cut Candidates:</span>
                <span className="text-[#00FF66] font-bold">{chaosAlert.cutVerticesCalculated.join(' | ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Telemetry Dashboard Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="voxel-box bg-[var(--bg-surface)] p-3">
            <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">FALKOR ENGINE</div>
            <div className="text-base font-black text-[#00FF66] flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#00FF66] inline-block shadow-[0_0_6px_#00FF66]" />
              ONLINE
            </div>
            <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
              {falkorStatus?.latencyMs !== undefined ? `${falkorStatus.latencyMs}ms latency` : 'Querying FalkorDB...'}
            </div>
          </div>

          <div className="voxel-box bg-[var(--bg-surface)] p-3">
            <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">TOTAL NODES</div>
            <div className="text-base font-black text-[var(--text-primary)]">
              {nodes.length} Entities
            </div>
            <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
              Across {new Set(nodes.map(n => n.tier)).size || 3} Tiers
            </div>
          </div>

          <div className="voxel-box bg-[var(--bg-surface)] p-3">
            <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">TOTAL EDGES</div>
            <div className="text-base font-black text-[var(--text-primary)]">
              {edges.length} Links
            </div>
            <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
              {Array.from(new Set(edges.map(e => e.type))).slice(0, 3).join(', ') || 'Active Conduits'}
            </div>
          </div>

          <div className="voxel-box bg-[var(--bg-surface)] p-3">
            <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">HEALTHY SVCS</div>
            <div className="text-base font-black text-[#00FF66]">
              {healthyCount} Active
            </div>
            <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
              Zero degradation
            </div>
          </div>

          <div className="voxel-box bg-[var(--bg-surface)] p-3">
            <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">AT RISK ENTITIES</div>
            <div className={`text-base font-black ${atRiskCount > 0 ? 'text-[#ffb703]' : 'text-[var(--text-primary)]'}`}>
              {atRiskCount} Nodes
            </div>
            <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
              {blastReport ? `${blastReport.impactDepthHops} hops away` : 'No active alert'}
            </div>
          </div>

          <div className="voxel-box bg-[var(--bg-surface)] p-3">
            <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">QUARANTINED</div>
            <div className="text-base font-black text-purple-600">
              {quarantinedCount} Nodes
            </div>
            <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
              Isolated in FalkorDB
            </div>
          </div>
        </div>

        {/* Central Workspace: 3D Voxel Topology & Blast Mitigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 3D Voxel Canvas */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00FF66]" />
                <h3 className="font-black text-xs uppercase tracking-wider">
                  LIVE ISOMETRIC CLOUD TOPOLOGY
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                CLICK ANY NODE TO INSPECT / CONTAIN BREACH
              </span>
            </div>

            <VoxelGraphCanvas
              nodes={nodes}
              edges={edges}
              blastReport={blastReport}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onTriggerIncidentOnNode={handleTriggerIncidentOnNode}
              isDark={theme === 'dark'}
            />
          </div>

          {/* Right: Incident Queue & Blast Radius Engine */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ff3366]" />
                <h3 className="font-black text-xs uppercase tracking-wider">
                  AUTONOMOUS BLAST RADIUS ENGINE
                </h3>
              </div>
              <VoxelBadge status="FALKORDB LIVE" size="sm" />
            </div>

            <IncidentCommanderFeed
              blastReport={blastReport}
              onBlastRadiusCalculated={setBlastReport}
              onRemediationApplied={handleRemediationApplied}
              selectedNode={selectedNode}
              nodes={nodes}
            />
          </div>
        </div>

        {/* SRE Command Deck & FalkorDB Intelligence Console */}
        <div className="space-y-3">
          <UnifiedConsoleDeck
            nodes={nodes}
            edges={edges}
            status={falkorStatus}
            onRefreshTopology={loadTopology}
            onOpenVisualBrowser={() => setIsBrowserOpen(true)}
            onSelectNode={setSelectedNode}
            onAskKimoMemory={(title) => setKimoPrompt(`Recall incident and containment playbook for: ${title}`)}
          />
        </div>
      </main>

      {/* KIMO: Floating AI Incident Copilot (Corner Widget) */}
      <KimoChatAssistant
        onBlastRadiusUpdated={setBlastReport}
        onRemediationApplied={handleRemediationApplied}
        onTopologyReset={handleResetTopology}
        selectedNode={selectedNode}
        externalPrompt={kimoPrompt}
        onClearExternalPrompt={() => setKimoPrompt(null)}
      />

      {/* Footer */}
      <footer className="border-t-3 border-[var(--border-color)] bg-[var(--bg-surface)] px-4 md:px-8 py-4 text-center text-xs font-mono text-[var(--text-secondary)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div>
            COMMANDER NODE: <span className="text-[#00FF66] font-bold">127.0.0.1:6379</span> (GRAPH: blastshield_infra)
          </div>
          <div>
            BlastShield AI Enterprise Autonomous Commander
          </div>
        </div>
      </footer>
    </div>
  );
}
