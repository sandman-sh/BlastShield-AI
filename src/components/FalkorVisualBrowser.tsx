'use client';

import React, { useState } from 'react';
import { Database, Search, Terminal, Cpu, Layers, ExternalLink, X, RefreshCw, CheckCircle2, ChevronRight, Download } from 'lucide-react';
import VoxelBadge from './VoxelBadge';
import VoxelButton from './VoxelButton';
import { GraphNode, GraphEdge, FalkorStatusResponse } from '@/lib/types';

interface FalkorVisualBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  status: FalkorStatusResponse | null;
  onSelectNode: (node: GraphNode) => void;
  onRefresh: () => void;
}

export default function FalkorVisualBrowser({
  isOpen,
  onClose,
  nodes,
  edges,
  status,
  onSelectNode,
  onRefresh
}: FalkorVisualBrowserProps) {
  const [activeTab, setActiveTab] = useState<'entities' | 'relationships' | 'schema' | 'telemetry' | 'audits'>('entities');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);

  React.useEffect(() => {
    if (activeTab === 'audits') {
      setIsLoadingAudits(true);
      fetch('/api/falkor/audits')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAudits(data.audits || []);
          }
        })
        .catch(err => console.error('Failed to load audits', err))
        .finally(() => setIsLoadingAudits(false));
    }
  }, [activeTab]);

  if (!isOpen) return null;

  // Filter entities
  const nodeTypes = ['ALL', ...Array.from(new Set(nodes.map(n => n.type)))];
  const filteredNodes = nodes.filter(n => {
    const matchesType = selectedType === 'ALL' || n.type === selectedType;
    const matchesSearch = n.name.toLowerCase().includes(search.toLowerCase()) || 
                          n.id.toLowerCase().includes(search.toLowerCase()) ||
                          n.status.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const exportGraphJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges, status }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `falkordb_topology_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[85vh] bg-[var(--bg-surface)] border-3 border-[var(--border-color)] shadow-[var(--voxel-shadow-lg)] flex flex-col overflow-hidden font-mono">
        {/* Apple-Level Minimalist Header */}
        <div className="border-b-2 border-[var(--border-color)] px-6 py-4 bg-[var(--bg-surface-elevated)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-black text-[#00FF66] border border-black flex items-center justify-center shadow-[1px_1px_0px_#00FF66]">
              <Database className="w-4 h-4 text-[#00FF66]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm md:text-base tracking-tight text-[var(--text-primary)]">
                  FALKORDB VISUAL EXPLORER
                </h2>
                <span className="text-[10px] bg-[#00FF66] text-black font-extrabold px-2 py-0.5 border border-black">
                  GRAPHBLAS v4.22
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-normal">
                Direct low-latency introspection of isolated graph: <code className="font-bold text-[#00FF66]">blastshield_infra</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportGraphJson}
              className="p-1.5 hover:bg-[#00FF66]/20 border border-[var(--border-color)] text-xs flex items-center gap-1 font-bold"
              title="Export Graph JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EXPORT</span>
            </button>
            <button
              onClick={onRefresh}
              className="p-1.5 hover:bg-[#00FF66]/20 border border-[var(--border-color)] text-xs flex items-center gap-1 font-bold"
              title="Refresh Graph Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#ff3366]/20 border border-[var(--border-color)] text-xs flex items-center justify-center font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimalist Tab Navigation */}
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-6 flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('entities')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'entities'
                ? 'border-[#00FF66] text-[var(--text-primary)] font-black'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Entities ({nodes.length})
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'relationships'
                ? 'border-[#00FF66] text-[var(--text-primary)] font-black'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Relationships ({edges.length})
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'schema'
                ? 'border-[#00FF66] text-[var(--text-primary)] font-black'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Graph Schema
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'telemetry'
                ? 'border-[#00FF66] text-[var(--text-primary)] font-black'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Telemetry & Engine
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'audits'
                ? 'border-[#00FF66] text-[var(--text-primary)] font-black'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Audit Ledger
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'entities' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface-elevated)] p-3 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search node by name, ID, or status..."
                    className="w-full bg-transparent text-xs focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {nodeTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`text-[10px] px-2 py-0.5 border cursor-pointer font-bold transition-colors ${
                        selectedType === type
                          ? 'bg-[#00FF66] text-black border-black'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#00FF66]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimalist Entity Table */}
              <div className="border border-[var(--border-color)] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-color)] text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                      <th className="p-3">Entity Identifier</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Region</th>
                      <th className="p-3">Metrics</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNodes.map(node => (
                      <tr
                        key={node.id}
                        className="border-b border-[var(--border-color)]/30 hover:bg-[#00FF66]/5 transition-colors"
                      >
                        <td className="p-3 font-bold text-[var(--text-primary)]">
                          {node.name}
                          <div className="text-[10px] text-[var(--text-secondary)] font-normal">{node.id}</div>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] bg-[var(--bg-surface-elevated)] px-1.5 py-0.5 border border-[var(--border-color)]">
                            {node.type}
                          </span>
                        </td>
                        <td className="p-3 font-extrabold">
                          Tier-{node.tier}
                        </td>
                        <td className="p-3">
                          <VoxelBadge status={node.status} size="sm" />
                        </td>
                        <td className="p-3 text-[var(--text-secondary)]">
                          {node.region || 'us-east-1'}
                        </td>
                        <td className="p-3 text-[var(--text-secondary)] font-mono">
                          {node.qps ? `${node.qps} QPS` : `${node.cpu_usage || 45}% CPU`}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              onSelectNode(node);
                              onClose();
                            }}
                            className="text-[10px] bg-black text-[#00FF66] px-2 py-1 font-bold border border-black hover:bg-[#00FF66] hover:text-black transition-colors"
                          >
                            SELECT
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'relationships' && (
            <div className="space-y-4">
              <div className="border border-[var(--border-color)] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-color)] text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                      <th className="p-3">Source Node</th>
                      <th className="p-3">Relationship</th>
                      <th className="p-3">Target Node</th>
                      <th className="p-3">Latency / Protocol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {edges.map((edge, idx) => (
                      <tr key={idx} className="border-b border-[var(--border-color)]/30 hover:bg-[#00FF66]/5">
                        <td className="p-3 font-bold">{edge.source}</td>
                        <td className="p-3 font-mono font-bold text-[#00FF66]">
                          -[:{edge.type}]-&gt;
                        </td>
                        <td className="p-3 font-bold">{edge.target}</td>
                        <td className="p-3 text-[var(--text-secondary)]">
                          {edge.latency_ms ? `${edge.latency_ms}ms (${edge.protocol || 'TCP'})` : 'Internal Binding'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-surface-elevated)] p-4 border border-[var(--border-color)] space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                    NODE LABELS & ONTOLOGY
                  </h4>
                  <ul className="text-xs space-y-2">
                    <li className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-1">
                      <span>Service (Microservices)</span>
                      <span className="font-bold text-[#00FF66]">5 nodes</span>
                    </li>
                    <li className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-1">
                      <span>Database (Primary, Replicas, Caches)</span>
                      <span className="font-bold text-[#00FF66]">4 nodes</span>
                    </li>
                    <li className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-1">
                      <span>K8sPod (Container instances)</span>
                      <span className="font-bold text-[#00FF66]">3 nodes</span>
                    </li>
                    <li className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-1">
                      <span>IAMRole (Identity bindings)</span>
                      <span className="font-bold text-[#00FF66]">3 nodes</span>
                    </li>
                    <li className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-1">
                      <span>Secret (KMS Encrypted Keys)</span>
                      <span className="font-bold text-[#00FF66]">3 nodes</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Gateways & Load Balancers</span>
                      <span className="font-bold text-[#00FF66]">3 nodes</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[var(--bg-surface-elevated)] p-4 border border-[var(--border-color)] space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                    DIRECTED EDGES
                  </h4>
                  <ul className="text-xs space-y-2">
                    <li className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-1">
                      <code className="text-[#00FF66]">[:CALLS]</code>
                      <span className="text-[var(--text-secondary)]">HTTP/2, gRPC RPC Calls</span>
                    </li>
                    <li className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-1">
                      <code className="text-[#00FF66]">[:CONNECTS_TO]</code>
                      <span className="text-[var(--text-secondary)]">DB Connection Pools</span>
                    </li>
                    <li className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-1">
                      <code className="text-[#00FF66]">[:ASSUMES]</code>
                      <span className="text-[var(--text-secondary)]">IAM Role Assumption</span>
                    </li>
                    <li className="flex justify-between items-center border-b border-[var(--border-color)]/30 pb-1">
                      <code className="text-[#00FF66]">[:PERMITS]</code>
                      <span className="text-[var(--text-secondary)]">KMS / RDS Policies</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <code className="text-[#00FF66]">[:REPLICATES_TO]</code>
                      <span className="text-[var(--text-secondary)]">Cross-AZ Replication</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-surface-elevated)] p-4 border border-[var(--border-color)] space-y-1">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase">INSTANCE STATUS</div>
                <div className="text-lg font-black text-[#00FF66] flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#00FF66] inline-block shadow-[0_0_6px_#00FF66]" />
                  HEALTHY (CONNECTED)
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">Host: 127.0.0.1:6379</div>
              </div>

              <div className="bg-[var(--bg-surface-elevated)] p-4 border border-[var(--border-color)] space-y-1">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase">ENGINE VERSION</div>
                <div className="text-lg font-black text-[var(--text-primary)]">FalkorDB 4.22.1</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">FalkorDB graph engine</div>
              </div>

              <div className="bg-[var(--bg-surface-elevated)] p-4 border border-[var(--border-color)] space-y-1">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase">ACTIVE GRAPHS</div>
                <div className="text-lg font-black text-[#00FF66]">
                  {status?.availableGraphs?.length || 1} Isolated Graph
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">Multigraph Topology</div>
              </div>
            </div>
          )}

          {activeTab === 'audits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-[var(--text-primary)]">
                    IMMUTABLE REMEDIATION AUDIT LOGS IN FALKORDB
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Cryptographic proofs logged via (:RemediationAudit) nodes during surgical mitigations.
                  </p>
                </div>
                <span className="text-[10px] bg-black text-[#00FF66] px-2 py-0.5 border border-[#00FF66]">
                  {audits.length} AUDIT NODES
                </span>
              </div>

              {isLoadingAudits ? (
                <div className="text-center py-8 text-xs text-[var(--text-secondary)]">
                  QUERYING FALKORDB AUDIT NODES...
                </div>
              ) : audits.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] p-6">
                  No remediation audits recorded yet. Trigger an incident mitigation or instruct KIMO to isolate a node to create immutable audit nodes.
                </div>
              ) : (
                <div className="border border-[var(--border-color)] overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-color)] text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                        <th className="p-3">Action ID</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Target Node</th>
                        <th className="p-3">Action Taken</th>
                        <th className="p-3">Cryptographic Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {audits.map((audit, idx) => (
                        <tr key={idx} className="hover:bg-[#00FF66]/5">
                          <td className="p-3 font-bold text-[#00FF66]">{audit.actionId}</td>
                          <td className="p-3 text-[var(--text-secondary)] font-mono text-[10px]">
                            {new Date(audit.timestamp).toLocaleTimeString()} ({new Date(audit.timestamp).toLocaleDateString()})
                          </td>
                          <td className="p-3 font-bold">{audit.targetNode}</td>
                          <td className="p-3 text-[var(--text-secondary)]">{audit.actionTaken}</td>
                          <td className="p-3 font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                            {audit.auditHash}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
