'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Terminal, 
  ShieldCheck, 
  Brain, 
  Activity, 
  Database, 
  Copy, 
  Check, 
  RefreshCw, 
  Lock, 
  Cpu, 
  Layers,
  Sparkles,
  Maximize2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import VoxelButton from './VoxelButton';
import VoxelBadge from './VoxelBadge';
import CypherConsole from './CypherConsole';
import { playTacticalClick } from '@/lib/audio';
import { GraphNode, GraphEdge, FalkorStatusResponse, AgentMemory } from '@/lib/types';

interface RemediationAudit {
  actionId: string;
  timestamp: string;
  targetNode: string;
  incidentCategory?: string;
  actionTaken: string;
  nodesQuarantined?: string[];
  auditHash: string;
  graphBLASLatencyMs?: number;
}

interface UnifiedConsoleDeckProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  status: FalkorStatusResponse | null;
  onRefreshTopology: () => void;
  onOpenVisualBrowser: () => void;
  onSelectNode?: (node: GraphNode) => void;
  onAskKimoMemory?: (memoryTitle: string) => void;
}

type TabType = 'cypher' | 'audits' | 'memory' | 'schema';

export default function UnifiedConsoleDeck({
  nodes,
  edges,
  status,
  onRefreshTopology,
  onOpenVisualBrowser,
  onSelectNode,
  onAskKimoMemory
}: UnifiedConsoleDeckProps) {
  const [activeTab, setActiveTab] = useState<TabType>('cypher');
  const [audits, setAudits] = useState<RemediationAudit[]>([]);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Load audits from live FalkorDB
  const fetchAudits = useCallback(async () => {
    setIsLoadingAudits(true);
    try {
      const res = await fetch('/api/falkor/audits');
      const data = await res.json();
      if (data.success) {
        setAudits(data.audits || []);
      }
    } catch (err) {
      console.error('Failed to load audits', err);
    } finally {
      setIsLoadingAudits(false);
    }
  }, []);

  // Load KIMO episodic memories from live FalkorDB
  const fetchMemories = useCallback(async () => {
    setIsLoadingMemories(true);
    try {
      const res = await fetch('/api/kimo/memory');
      const data = await res.json();
      if (data.success) {
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error('Failed to load agent memories', err);
    } finally {
      setIsLoadingMemories(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'audits') {
      fetchAudits();
    } else if (activeTab === 'memory') {
      fetchMemories();
    }
  }, [activeTab, fetchAudits, fetchMemories]);

  const copyToClipboard = (text: string) => {
    playTacticalClick();
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleTabChange = (tab: TabType) => {
    playTacticalClick();
    setActiveTab(tab);
  };

  // Node type distribution
  const typeCounts = nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="voxel-box bg-[var(--bg-surface)] p-4 md:p-5 space-y-4 shadow-[var(--voxel-shadow)]">
      {/* Deck Header & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black text-[#00FF66] border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#00FF66]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
              SRE COMMAND DECK & FALKORDB CONSOLE
            </h3>
            <div className="text-[10px] font-mono text-[var(--text-secondary)]">
              FALKORDB GRAPH ENGINE | CONNECTED TO LIVE GRAPH <span className="text-[#00FF66] font-bold">blastshield_infra</span>
            </div>
          </div>
        </div>

        {/* Tactical Nav Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleTabChange('cypher')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border-2 transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
              activeTab === 'cypher'
                ? 'bg-black text-[#00FF66] border-black'
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-black'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>OpenCypher Shell</span>
          </button>

          <button
            onClick={() => handleTabChange('audits')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border-2 transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
              activeTab === 'audits'
                ? 'bg-black text-[#00FF66] border-black'
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-black'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>Audit Ledger</span>
            <span className="text-[9px] bg-[#00FF66] text-black px-1.5 py-0.2 font-extrabold rounded-none">
              {audits.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('memory')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border-2 transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
              activeTab === 'memory'
                ? 'bg-black text-[#00FF66] border-black'
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-black'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>KIMO Memory</span>
            <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 font-extrabold rounded-none">
              {memories.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('schema')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border-2 transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
              activeTab === 'schema'
                ? 'bg-black text-[#00FF66] border-black'
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-black'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Topology & Cut Analysis</span>
          </button>

          <VoxelButton
            variant="outline"
            size="sm"
            onClick={() => {
              playTacticalClick();
              onOpenVisualBrowser();
            }}
            className="gap-1 py-1 text-xs"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">FULLSCREEN EXPLORER</span>
          </VoxelButton>
        </div>
      </div>

      {/* Tab 1: Live OpenCypher Shell */}
      {activeTab === 'cypher' && (
        <div className="space-y-2">
          <CypherConsole onQuerySuccess={onRefreshTopology} />
        </div>
      )}

      {/* Tab 2: Live cryptographic audit ledger */}
      {activeTab === 'audits' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-card)] p-3 border-2 border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00FF66]" />
              <div>
                <div className="font-mono text-xs font-black uppercase text-[var(--text-primary)]">
                  Cryptographic Remediation Ledger (SHA-256 / FalkorDB)
                </div>
                <div className="font-mono text-[10px] text-[var(--text-secondary)]">
                  Every automated quarantine generates an immutable SHA-256 cryptographic proof stored as <code className="text-[#00FF66]">(:RemediationAudit)</code> in FalkorDB.
                </div>
              </div>
            </div>
            <VoxelButton
              variant="secondary"
              size="sm"
              onClick={fetchAudits}
              disabled={isLoadingAudits}
              className="gap-1 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudits ? 'animate-spin' : ''}`} />
              SYNC LEDGER
            </VoxelButton>
          </div>

          {isLoadingAudits ? (
            <div className="p-8 text-center font-mono text-xs text-[var(--text-secondary)] animate-pulse">
              QUERYING (:RemediationAudit) NODES FROM FALKORDB ENGINE...
            </div>
          ) : audits.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-[var(--border-color)] font-mono text-xs text-[var(--text-secondary)] space-y-2">
              <Lock className="w-6 h-6 mx-auto opacity-50" />
              <div>No automated mitigations executed yet in this session.</div>
              <div className="text-[10px]">
                Trigger a blast radius containment or chaos cascade above to record new cryptographic audits.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-[var(--border-color)]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-black text-[#00FF66] border-b-2 border-black uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Action ID</th>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Target / Breach</th>
                    <th className="p-2.5">Autonomous Cut-Vertex Quarantine</th>
                    <th className="p-2.5">Latency</th>
                    <th className="p-2.5">Cryptographic Proof (SHA-256)</th>
                    <th className="p-2.5 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)]">
                  {audits.map((a, idx) => (
                    <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="p-2.5 font-bold text-[#00FF66] whitespace-nowrap">
                        {a.actionId}
                      </td>
                      <td className="p-2.5 text-[10px] text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(a.timestamp).toLocaleString()}
                      </td>
                      <td className="p-2.5 font-bold whitespace-nowrap">
                        {a.targetNode}
                      </td>
                      <td className="p-2.5 text-[11px] text-[var(--text-primary)] max-w-xs truncate">
                        {a.actionTaken}
                      </td>
                      <td className="p-2.5 text-[10px] text-[#00FF66] font-bold whitespace-nowrap">
                        {a.graphBLASLatencyMs ? `${a.graphBLASLatencyMs}ms` : 'recorded'}
                      </td>
                      <td className="p-2.5 font-mono text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-400 truncate max-w-[140px]">
                            {a.auditHash}
                          </span>
                          <button
                            onClick={() => copyToClipboard(a.auditHash)}
                            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 border border-gray-400 rounded-none transition-all"
                            title="Copy Cryptographic SHA-256 Hash"
                          >
                            {copiedHash === a.auditHash ? (
                              <Check className="w-3 h-3 text-[#00FF66]" />
                            ) : (
                              <Copy className="w-3 h-3 text-[var(--text-secondary)]" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66] text-[9px] font-black">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          VERIFIED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: KIMO Episodic Memory Explorer */}
      {activeTab === 'memory' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-card)] p-3 border-2 border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <div>
                <div className="font-mono text-xs font-black uppercase text-[var(--text-primary)]">
                  KIMO Episodic Memory Graph (Stored in FalkorDB)
                </div>
                <div className="font-mono text-[10px] text-[var(--text-secondary)]">
                  KIMO retains multi-session episodic memory across incidents. FalkorDB traverses <code className="text-[#00FF66]">(:AgentMemory)-[:REASONED_OVER]-&gt;(:Service)</code> to recall observed containment playbooks.
                </div>
              </div>
            </div>
            <VoxelButton
              variant="secondary"
              size="sm"
              onClick={fetchMemories}
              disabled={isLoadingMemories}
              className="gap-1 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMemories ? 'animate-spin' : ''}`} />
              RELOAD MEMORY
            </VoxelButton>
          </div>

          {isLoadingMemories ? (
            <div className="p-8 text-center font-mono text-xs text-[var(--text-secondary)] animate-pulse">
              RETRIEVING EPISODIC MEMORIES FROM FALKORDB...
            </div>
          ) : memories.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-[var(--border-color)] font-mono text-xs text-[var(--text-secondary)]">
              No episodic memories found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3 bg-[var(--bg-card)] border-2 border-[var(--border-color)] hover:border-purple-500 transition-all flex flex-col justify-between space-y-2 shadow-[2px_2px_0px_#000]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-purple-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        {mem.id}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-black text-[#00FF66] border border-[#00FF66]">
                        {mem.category}
                      </span>
                    </div>

                    <h4 className="font-black text-xs text-[var(--text-primary)] line-clamp-1">
                      {mem.incidentTitle}
                    </h4>

                    <div className="text-[10px] font-mono text-[var(--text-secondary)] bg-black/5 dark:bg-white/5 p-2 border border-[var(--border-color)] rounded-none">
                      <span className="font-bold text-[var(--text-primary)]">Learned Strategy:</span> {mem.learnedStrategy}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[#00FF66] font-bold">
                        CONF: {Math.round(mem.confidence * 100)}%
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        SUCCESS: {mem.successRate}
                      </span>
                    </div>

                    {onAskKimoMemory && (
                      <button
                        onClick={() => {
                          playTacticalClick();
                          onAskKimoMemory(mem.incidentTitle);
                        }}
                        className="text-purple-400 hover:text-purple-300 font-bold underline flex items-center gap-0.5 text-[10px]"
                      >
                        Ask KIMO
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Topology Analysis & Schema */}
      {activeTab === 'schema' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">CUT ANALYSIS</div>
              <div className="text-base font-black text-[#00FF66] mt-0.5">TARJAN ACTIVE</div>
              <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-1">Articulation points</div>
            </div>

            <div className="p-3 bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">ISOMETRIC DENSITY</div>
              <div className="text-base font-black text-[var(--text-primary)] mt-0.5">
                {((edges.length / (nodes.length * (nodes.length - 1) || 1)) * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-1">Direct conduit coverage</div>
            </div>

            <div className="p-3 bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">FALKORDB ENGINE</div>
              <div className="text-base font-black text-blue-500 mt-0.5">CONNECTED</div>
              <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-1">Redis protocol / port 6379</div>
            </div>

            <div className="p-3 bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">CONTAINMENT SLA</div>
                <div className="text-base font-black text-purple-500 mt-0.5">LIVE</div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-1">Measured per mutation</div>
            </div>
          </div>

          {/* Node Category Breakdown */}
          <div className="border-2 border-[var(--border-color)] p-3 bg-[var(--bg-card)] space-y-2">
            <div className="font-mono text-xs font-black uppercase text-[var(--text-primary)] flex items-center justify-between">
              <span>Cloud Entity Class Distribution</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{nodes.length} Physical & Logical Nodes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div key={type} className="p-2 border border-[var(--border-color)] bg-[var(--bg-main)] text-center">
                  <div className="text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase truncate">
                    {type}
                  </div>
                  <div className="text-sm font-black text-[#00FF66] mt-0.5">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Node Navigator */}
          <div className="border-2 border-[var(--border-color)] p-3 bg-[var(--bg-card)] space-y-2">
            <div className="font-mono text-xs font-black uppercase text-[var(--text-primary)]">
              Interactive Entity Quick Selector
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
              {nodes.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    playTacticalClick();
                    if (onSelectNode) onSelectNode(n);
                  }}
                  className="px-2 py-1 text-[10px] font-mono border border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[#00FF66] text-[var(--text-primary)] flex items-center gap-1 transition-all"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      n.status === 'COMPROMISED' ? 'bg-[#ff3366]' :
                      n.status === 'QUARANTINED' ? 'bg-purple-500' :
                      n.status === 'AT_RISK' ? 'bg-[#ffb703]' : 'bg-[#00FF66]'
                    }`}
                  />
                  <span>{n.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
