'use client';

import React, { useState } from 'react';
import { Terminal, Play, Zap, CheckCircle2, AlertTriangle, Code2 } from 'lucide-react';
import VoxelButton from './VoxelButton';
import VoxelBadge from './VoxelBadge';

interface CypherConsoleProps {
  onQuerySuccess?: () => void;
}

export default function CypherConsole({ onQuerySuccess }: CypherConsoleProps) {
  const [cypher, setCypher] = useState(`MATCH (n) RETURN labels(n)[0] as type, count(n) as count ORDER BY count DESC`);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    columns?: string[];
    records?: any[][];
    stats?: string[];
    executionTimeMs?: number;
    error?: string;
  } | null>(null);

  const predefinedQueries = [
    {
      label: 'Summary by Node Type',
      query: `MATCH (n) RETURN labels(n)[0] as type, count(n) as total_nodes ORDER BY total_nodes DESC`
    },
    {
      label: 'Tier-1 Critical Services',
      query: `MATCH (s:Service {tier: 1}) RETURN s.id as id, s.name as name, s.qps as qps, s.status as status`
    },
    {
      label: 'Pod to Secret Permissions',
      query: `MATCH path = (p:K8sPod)-[:ASSUMES]->(role:IAMRole)-[:PERMITS]->(sec:Secret) RETURN p.name, role.name, sec.name`
    },
    {
      label: 'Database Connectors',
      query: `MATCH (s:Service)-[r:CONNECTS_TO]->(db:Database) RETURN s.name, type(r), db.name, r.pool_size`
    },
    {
      label: 'Audit Trail Logs',
      query: `MATCH (a:RemediationAudit) RETURN a.actionId, a.timestamp, a.targetNode, a.auditHash ORDER BY a.timestamp DESC LIMIT 5`
    }
  ];

  const handleRun = async () => {
    if (!cypher.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/falkor/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cypher: cypher.trim() })
      });
      const data = await res.json();

      if (data.success) {
        setResult({
          columns: data.columns,
          records: data.records,
          stats: data.stats,
          executionTimeMs: data.executionTimeMs
        });
        if (onQuerySuccess) onQuerySuccess();
      } else {
        setResult({ error: data.error || 'Execution failed' });
      }
    } catch (err: any) {
      setResult({ error: err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voxel-box bg-[var(--bg-surface)] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-[#00FF66]" />
          <h3 className="font-black text-sm uppercase tracking-wider">
            LIVE FALKORDB CYPHER TERMINAL
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <VoxelBadge status="GRAPHBLAS ENGINE" size="sm" />
          <span className="text-[10px] font-mono bg-black text-[#00FF66] px-2 py-0.5 border border-black shadow-[1px_1px_0px_#00FF66]">
            PORT: 6379
          </span>
        </div>
      </div>

      {/* Preset Query Chips */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-extrabold uppercase text-[var(--text-secondary)]">
          QUICK QUERY TEMPLATES:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {predefinedQueries.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => setCypher(pq.query)}
              className="text-[10px] font-mono font-bold bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-color)] px-2 py-1 hover:border-[#00FF66] hover:bg-[#00FF66]/10 transition-colors shadow-[1px_1px_0px_#000]"
            >
              {pq.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cypher Input Editor */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={cypher}
            onChange={(e) => setCypher(e.target.value)}
            rows={3}
            placeholder="MATCH (n) RETURN n..."
            className="w-full bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-3 border-[var(--border-color)] p-3 text-xs font-mono focus:outline-none focus:border-[#00FF66] shadow-[2px_2px_0px_#000]"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">
            Execute native OpenCypher directly against FalkorDB.
          </span>
          <VoxelButton
            variant="primary"
            size="sm"
            onClick={handleRun}
            disabled={loading}
            className="gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? 'EXECUTING...' : 'RUN CYPHER'}
          </VoxelButton>
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div className="border-3 border-[var(--border-color)] bg-[var(--bg-surface-elevated)] p-3 space-y-2 text-xs font-mono shadow-[2px_2px_0px_#000]">
          {result.error ? (
            <div className="flex items-center gap-2 text-[#ff3366] font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{result.error}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#00FF66]">
                  <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />
                  <span>EXECUTION SUCCESSFUL</span>
                </div>
                <div className="font-extrabold text-[10px] bg-black text-[#00FF66] px-2 py-0.5">
                  LATENCY: {result.executionTimeMs} ms
                </div>
              </div>

              {/* Data Table */}
              {result.records && result.records.length > 0 ? (
                <div className="overflow-x-auto max-h-48 border border-[var(--border-color)]">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[var(--border-color)] text-[var(--bg-surface)]">
                        {result.columns?.map((col, idx) => (
                          <th key={idx} className="p-1.5 font-bold uppercase">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.records.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-[var(--border-color)]/30 hover:bg-[#00FF66]/10">
                          {row.map((val: any, colIdx: number) => (
                            <td key={colIdx} className="p-1.5">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-[var(--text-secondary)] italic">
                  No records returned or mutation query executed.
                </div>
              )}

              {/* Stats Output */}
              {result.stats && result.stats.length > 0 && (
                <div className="text-[10px] text-[var(--text-secondary)] pt-1 space-y-0.5">
                  {result.stats.map((s, idx) => (
                    <div key={idx}>⚡ {s}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
