'use client';

import React, { useState, useEffect } from 'react';
import { Incident, BlastRadiusReport, RemediationResult, GraphNode } from '@/lib/types';
import { AlertCircle, ShieldCheck, Zap, Scissors, Check, Terminal, ExternalLink, ArrowRight, FileText, Scale, TrendingDown, Shield } from 'lucide-react';
import VoxelBadge from './VoxelBadge';
import VoxelButton from './VoxelButton';
import { playBlastPulse, playRemediationSuccess, playTacticalClick } from '@/lib/audio';

interface IncidentCommanderFeedProps {
  blastReport: BlastRadiusReport | null;
  onBlastRadiusCalculated: (report: BlastRadiusReport | null) => void;
  onRemediationApplied: () => void;
  selectedNode: GraphNode | null;
  nodes?: GraphNode[];
}

export default function IncidentCommanderFeed({
  blastReport,
  onBlastRadiusCalculated,
  onRemediationApplied,
  selectedNode,
  nodes = []
}: IncidentCommanderFeedProps) {
  // Dynamically derive incidents from live FalkorDB nodes
  const dynamicIncidents: Incident[] = React.useMemo(() => {
    const list: Incident[] = [];

    // 1. Any live compromised nodes from FalkorDB take top priority
    nodes.filter(n => n.status === 'COMPROMISED').forEach(n => {
      list.push({
        id: `INC-LIVE-${n.id.toUpperCase()}`,
        title: `CRITICAL ZERO-DAY BREACH: ${n.name}`,
        severity: 'CRITICAL',
        category: n.type === 'K8sPod' ? 'IAM_LEAK' : n.type === 'IAMRole' ? 'UNAUTHORIZED_INGRESS' : 'CASCADING_LATENCY',
        sourceNodeId: n.id,
        sourceNodeName: n.name,
        timestamp: 'ACTIVE RIGHT NOW',
        description: `Active anomaly detected in FalkorDB on ${n.name} (${n.type}, Tier-${n.tier}). Immediate multi-hop blast containment required.`,
        detectedVector: 'eBPF Kernel Anomaly & Runtime Ingress Audit'
      });
    });

    // Investigation candidates are derived from the live graph. There is no
    // client-side incident catalogue: every selectable target exists in FalkorDB.
    nodes
      .filter((node) => node.status !== 'QUARANTINED' && ['K8sPod', 'Service', 'IAMRole', 'Database'].includes(node.type))
      .slice(0, 6)
      .forEach((node) => {
        const category = node.type === 'K8sPod'
          ? 'IAM_LEAK'
          : node.type === 'Database'
            ? 'CASCADING_LATENCY'
            : node.type === 'IAMRole'
              ? 'UNAUTHORIZED_INGRESS'
              : 'DATA_EXFILTRATION';
        const severity = node.status === 'COMPROMISED' || node.tier === 1 ? 'CRITICAL' : node.tier === 2 ? 'HIGH' : 'MEDIUM';
        if (list.some((incident) => incident.sourceNodeId === node.id)) return;
        list.push({
          id: `INC-LIVE-${node.id.toUpperCase()}`,
          title: `Investigate ${node.name}`,
          severity,
          category,
          sourceNodeId: node.id,
          sourceNodeName: node.name,
          timestamp: node.status === 'COMPROMISED' ? 'ACTIVE RIGHT NOW' : 'LIVE GRAPH CANDIDATE',
          description: `Graph-native investigation target: ${node.type}, Tier-${node.tier}, status ${node.status}, region ${node.region || 'unknown'}.`,
          detectedVector: 'FalkorDB topology inspection'
        });
      });

    return list;
  }, [nodes]);

  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [remediationResult, setRemediationResult] = useState<RemediationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isRemediating, setIsRemediating] = useState(false);

  // Set default active incident once dynamic incidents are available
  useEffect(() => {
    if (!activeIncident && dynamicIncidents.length > 0) {
      setActiveIncident(dynamicIncidents[0]);
    }
  }, [dynamicIncidents, activeIncident]);

  // Sync active incident if selected node matches an incident or create custom incident for selected node
  useEffect(() => {
    if (selectedNode) {
      const match = dynamicIncidents.find(inc => inc.sourceNodeId === selectedNode.id);
      if (match) {
        setActiveIncident(match);
      } else {
        // Construct real dynamic incident on the selected node
        setActiveIncident({
          id: `INC-NODE-${selectedNode.id}`,
          title: `Security Anomaly on ${selectedNode.name}`,
          severity: selectedNode.tier === 1 ? 'CRITICAL' : selectedNode.tier === 2 ? 'HIGH' : 'MEDIUM',
          category: selectedNode.type === 'K8sPod' ? 'IAM_LEAK' : selectedNode.type === 'Database' ? 'CASCADING_LATENCY' : selectedNode.type === 'Secret' ? 'DATA_EXFILTRATION' : 'UNAUTHORIZED_INGRESS',
          sourceNodeId: selectedNode.id,
          sourceNodeName: selectedNode.name,
          timestamp: 'Live Inspection',
          description: `Targeted investigation on ${selectedNode.name} (Tier-${selectedNode.tier} ${selectedNode.type}). Real-time telemetry: ${selectedNode.qps ? `${selectedNode.qps} QPS` : `${selectedNode.cpu_usage || 45}% CPU`}, Region: ${selectedNode.region || 'us-east-1'}. Status in FalkorDB: ${selectedNode.status}.`,
          detectedVector: `${selectedNode.type} Runtime Telemetry & FalkorDB Inspection`
        });
      }
    }
  }, [selectedNode, dynamicIncidents]);

  const handleComputeBlastRadius = async (incident: Incident) => {
    setActiveIncident(incident);
    setIsCalculating(true);
    setRemediationResult(null);
    playBlastPulse();

    try {
      const res = await fetch('/api/falkor/blast-radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceNodeId: incident.sourceNodeId,
          incidentCategory: incident.category
        })
      });

      const data = await res.json();
      if (data.success && data.report) {
        onBlastRadiusCalculated(data.report);
      }
    } catch (err) {
      console.error('Blast radius calculation failed', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApplyRemediation = async () => {
    if (!activeIncident || !blastReport) return;
    setIsRemediating(true);

    try {
      const cutAction = blastReport.cutVertices[0]?.action || 'ISOLATE_COMPROMISED_POD';
      const res = await fetch('/api/falkor/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceNodeId: activeIncident.sourceNodeId,
          cutVertexAction: cutAction
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        playRemediationSuccess();
        setRemediationResult(data.result);
        onRemediationApplied();
      }
    } catch (err) {
      console.error('Remediation failed', err);
    } finally {
      setIsRemediating(false);
    }
  };

  const handleSelectCustomEntity = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const customInc: Incident = {
      id: `INC-${node.id.toUpperCase()}`,
      title: `Containment Traversal for ${node.name}`,
      severity: node.tier === 1 ? 'CRITICAL' : node.tier === 2 ? 'HIGH' : 'MEDIUM',
      category: node.type === 'K8sPod' ? 'IAM_LEAK' : node.type === 'Database' ? 'CASCADING_LATENCY' : 'UNAUTHORIZED_INGRESS',
      sourceNodeId: node.id,
      sourceNodeName: node.name,
      timestamp: 'Targeted Anomaly',
      description: `Targeted investigation on ${node.name} (${node.type}, Tier-${node.tier}). FalkorDB status: ${node.status}, Region: ${node.region || 'us-east-1'}.`,
      detectedVector: 'Manual Threat Hunting / Incident Commander Command'
    };
    setActiveIncident(customInc);
    handleComputeBlastRadius(customInc);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Incident Selection Strip */}
      <div className="voxel-box bg-[var(--bg-surface)] p-3">
        <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#ff3366]" />
            <span className="font-black text-xs uppercase tracking-wider">
              REAL-TIME CLOUD INCIDENT QUEUE
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">
            CLICK INCIDENT TO ANALYZE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {dynamicIncidents.map((inc) => {
            const isSelected = activeIncident?.id === inc.id;
            const isQuarantined = inc.timestamp.includes('CONTAINED');
            return (
              <div
                key={inc.id}
                onClick={() => handleComputeBlastRadius(inc)}
                className={`p-2.5 border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#00FF66]/15 border-[#000000] dark:border-[#00FF66] shadow-[2px_2px_0px_#000]'
                    : 'bg-[var(--bg-surface-elevated)] border-[var(--border-color)] hover:border-[#00FF66]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold">{inc.id}</span>
                  <VoxelBadge status={isQuarantined ? 'CONTAINED' : inc.severity} size="sm" />
                </div>
                <div className="font-extrabold text-xs text-[var(--text-primary)] line-clamp-1">
                  {inc.title}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1 flex items-center justify-between">
                  <span>SOURCE: <strong className="text-[#00FF66]">{inc.sourceNodeName}</strong></span>
                  <span className="text-[9px] opacity-80">{inc.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Universal Entity Selector: Target ANY node in FalkorDB */}
        {nodes.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
              TARGET ANY LIVE ENTITY IN GRAPH:
            </span>
            <select
              value={activeIncident?.sourceNodeId || ''}
              onChange={(e) => handleSelectCustomEntity(e.target.value)}
              className="text-xs bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-2 border-[var(--border-color)] px-2 py-1 focus:outline-none focus:border-[#00FF66] font-mono cursor-pointer"
            >
              <option value="" disabled>-- Select Live Node from FalkorDB ({nodes.length} available) --</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.type} • Tier-{n.tier} • {n.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Active Incident Deep-Dive & Blast Radius Panel */}
      {activeIncident && (
        <div className="voxel-box bg-[var(--bg-surface)] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--border-color)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs bg-black text-[#00FF66] px-2 py-0.5">
                  {activeIncident.id}
                </span>
                <h3 className="font-black text-sm uppercase">{activeIncident.title}</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {activeIncident.description}
              </p>
            </div>
            <VoxelButton
              variant="primary"
              size="sm"
              onClick={() => handleComputeBlastRadius(activeIncident)}
              disabled={isCalculating}
              className="gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              {isCalculating ? 'TRAVERSING GRAPH...' : 'COMPUTE BLAST RADIUS'}
            </VoxelButton>
          </div>

          {/* Blast Radius Results Breakdown */}
          {blastReport && (
            <div className="space-y-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-[var(--bg-surface-elevated)] p-2.5 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
                  <div className="text-[10px] text-[var(--text-secondary)]">TOPOLOGICAL HOPS</div>
                  <div className="text-xl font-black text-[#ff3366]">{blastReport.impactDepthHops} Hops</div>
                </div>

                <div className="bg-[var(--bg-surface-elevated)] p-2.5 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
                  <div className="text-[10px] text-[var(--text-secondary)]">IMPACTED ENTITIES</div>
                  <div className="text-xl font-black text-[var(--text-primary)]">
                    {blastReport.impactedNodes.length} Nodes
                  </div>
                </div>

                <div className="bg-[var(--bg-surface-elevated)] p-2.5 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
                  <div className="text-[10px] text-[var(--text-secondary)]">AT-RISK TIER 1 SVCS</div>
                  <div className="text-xl font-black text-[#ffb703]">
                    {blastReport.totalAtRiskTier1Services} Mission-Critical
                  </div>
                </div>

                <div className="bg-[var(--bg-surface-elevated)] p-2.5 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
                  <div className="text-[10px] text-[var(--text-secondary)]">FALKOR LATENCY</div>
                  <div className="text-xl font-black text-[#00FF66]">{blastReport.executionTimeMs} ms</div>
                </div>
              </div>

              {/* Mathematical Proof Card */}
              <div className="bg-[var(--bg-surface-elevated)] p-3 border-2 border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00FF66]" />
                    TOPOLOGY SAFETY EVIDENCE
                  </span>
                  <span className="text-[10px] bg-black text-white px-2 py-0.5">
                    MEASURED BEFORE / AFTER
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {blastReport.mathematicalSafetyProof}
                </p>
                <div className="text-[10px] bg-black/90 text-[#00FF66] p-2 border border-black overflow-x-auto">
                  <code>{blastReport.cypherQueryUsed}</code>
                </div>
              </div>

              {/* What-If Cut-Vertex Comparison Engine */}
              <div className="bg-[var(--bg-surface-elevated)] p-3.5 border-2 border-[var(--border-color)] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                  <span className="font-black text-xs uppercase flex items-center gap-1.5 text-[var(--text-primary)]">
                    <Scale className="w-4 h-4 text-[#00FF66]" />
                    "WHAT-IF" MITIGATION IMPACT COMPARISON
                  </span>
                  <span className="text-[10px] font-bold bg-[#00FF66] text-black px-1.5 py-0.5">
                     FALKORDB + TARJAN
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  {/* Left: Blind Cluster Restart (Current Standard Practice) */}
                  <div className="bg-red-950/20 border-2 border-red-500/50 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-red-500 font-bold">
                      <span>NAIVE CLOUD KILL (BLIND RESTART)</span>
                      <TrendingDown className="w-3.5 h-3.5" />
                    </div>
                    <ul className="space-y-1 text-[10px] text-[var(--text-secondary)]">
                      <li className="flex justify-between">
                        <span>Ingress-reachable nodes before:</span>
                        <strong className="text-red-400">{blastReport.analysis.reachableBefore}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Candidate cut vertices:</span>
                        <strong className="text-red-400">{blastReport.analysis.candidateCutVertices.length}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Analysis algorithm:</span>
                        <strong className="text-red-400">Tarjan</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Mutation state:</span>
                        <strong className="text-red-400">Not applied</strong>
                      </li>
                    </ul>
                  </div>

                  {/* Right: FalkorDB graph cut analysis */}
                  <div className="bg-[#00FF66]/10 border-2 border-[#00FF66] p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[#00FF66] font-bold">
                      <span>FALKORDB SURGICAL CUT-VERTEX</span>
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <ul className="space-y-1 text-[10px] text-[var(--text-secondary)]">
                      <li className="flex justify-between">
                        <span>Ingress-reachable nodes after:</span>
                        <strong className="text-[#00FF66]">{blastReport.analysis.reachableAfter}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Protected Tier-1 paths:</span>
                        <strong className="text-[#00FF66]">{blastReport.analysis.protectedTier1Paths}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Graph query latency:</span>
                        <strong className="text-[#00FF66]">{blastReport.executionTimeMs}ms</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Mutation state:</span>
                        <strong className="text-[#00FF66]">Approval required</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Remediation Action Trigger */}
              <div className="border-3 border-black dark:border-[#00FF66] bg-[#00FF66]/10 p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-xs uppercase text-[var(--text-primary)]">
                    RECOMMENDED SURGICAL ACTION: {blastReport.cutVertices[0]?.action}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Target: {blastReport.cutVertices[0]?.nodeName} | Traffic Redirect:{' '}
                    <span className="font-bold text-[#00FF66]">
                      {blastReport.cutVertices[0]?.trafficRedirectTarget || 'Failover Pool'}
                    </span>
                  </div>
                </div>

                <VoxelButton
                  variant="danger"
                  size="md"
                  onClick={handleApplyRemediation}
                  disabled={isRemediating || remediationResult !== null}
                  className="gap-2"
                >
                  <Scissors className="w-4 h-4" />
                  {isRemediating
                    ? 'APPLYING MUTATION IN FALKORDB...'
                    : remediationResult
                    ? 'REMEDIATION APPLIED'
                    : 'EXECUTE SURGICAL MITIGATION'}
                </VoxelButton>
              </div>
            </div>
          )}

          {/* Remediation Result Audit Badge (Persistent confirmation) */}
          {remediationResult && (
            <div className="bg-[var(--bg-surface-elevated)] border-3 border-[#00FF66] p-4 space-y-3 shadow-[3px_3px_0px_#00FF66] animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-black text-[#00FF66]">
                  <Check className="w-4 h-4 text-[#00FF66]" />
                  REMEDIATION COMPLETE & AUDITED IN FALKORDB
                </div>
                <span className="text-[10px] bg-black text-[#00FF66] px-2 py-0.5 border border-[#00FF66]">
                  HASH: {remediationResult.auditHash}
                </span>
              </div>
              <ul className="text-xs space-y-1 text-[var(--text-secondary)]">
                {remediationResult.actionsApplied.map((act, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-[#00FF66] font-bold">✓</span> {act}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Execution Latency: <strong className="text-[#00FF66]">{remediationResult.executionTimeMs}ms</strong> | Quarantined: <strong>{remediationResult.nodesModified.join(', ')}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!remediationResult || !activeIncident) return;
                      const content = `# BLASTSHIELD AI // INCIDENT POST-MORTEM
**Incident ID:** ${activeIncident.id}
**Classification:** CRITICAL RESTRICTED INCIDENT
**Timestamp:** ${remediationResult.timestamp}
**Targeted Node:** ${activeIncident.sourceNodeId} (${activeIncident.sourceNodeName})
**Detection Vector:** ${activeIncident.detectedVector}

---

## 1. Executive Summary
 A graph-backed containment action was applied after operator approval. Evidence came from live FalkorDB traversal and cut analysis.

- **Incident Category:** ${activeIncident.category}
- **Autonomous Remediation Action:** ${blastReport?.cutVertices[0]?.action || 'ISOLATE_NODE'}
- **Failover Route Engaged:** ${blastReport?.cutVertices[0]?.trafficRedirectTarget || 'Healthy Replica Pool'}
 - **FalkorDB Mutation Latency:** ${remediationResult.executionTimeMs} ms
- **Cryptographic Audit Proof Hash:** ${remediationResult.auditHash}

---

 ## 2. Topology Safety Evidence
 ${blastReport?.mathematicalSafetyProof || 'No analysis report was attached to this mutation.'}

### OpenCypher Query Executed:
\`\`\`cypher
 ${blastReport?.cypherQueryUsed || 'No query was attached to this mutation.'}
\`\`\`

---

## 3. Operations & Graph Mutations Applied
${remediationResult.actionsApplied.map(a => `- [x] ${a}`).join('\n')}

---

## 4. FalkorDB Cryptographic Verification
- Audit Node: (:RemediationAudit { actionId: "${remediationResult.actionId}", auditHash: "${remediationResult.auditHash}" })
- Host Engine: 127.0.0.1:6379 (Graph: blastshield_infra)
 - Compliance status: This export is an operational evidence record, not a certification.
`;
                      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                     link.download = `blastshield_postmortem_${activeIncident.id}_${Date.now()}.md`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-[10px] font-bold bg-[#00FF66] text-black px-2.5 py-1 border border-black hover:bg-black hover:text-[#00FF66] cursor-pointer transition-colors flex items-center gap-1 shadow-[1px_1px_0px_#000]"
                  >
                    <FileText className="w-3 h-3" />
                     EXPORT INCIDENT POST-MORTEM
                  </button>
                  <button
                    onClick={() => {
                      setRemediationResult(null);
                      onBlastRadiusCalculated(null);
                    }}
                    className="text-[10px] font-bold bg-black text-[#00FF66] px-2.5 py-1 hover:bg-[#00FF66] hover:text-black border border-black cursor-pointer transition-colors"
                  >
                    CLOSE AUDIT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
