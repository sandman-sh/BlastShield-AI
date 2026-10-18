'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Server, 
  Cpu, 
  Zap, 
  Lock, 
  Terminal, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight, 
  Layers, 
  Database,
  Flame,
  Check,
  ShieldCheck,
  Activity,
  Play
} from 'lucide-react';
import VoxelButton from '@/components/VoxelButton';
import VoxelBadge from '@/components/VoxelBadge';
import VoxelThemeToggle from '@/components/VoxelThemeToggle';
import ClearanceModal from '@/components/ClearanceModal';
import { FalkorStatusResponse } from '@/lib/types';

export default function HomePage() {
  const [falkorStatus, setFalkorStatus] = useState<FalkorStatusResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playgroundQuery, setPlaygroundQuery] = useState(`MATCH (s:Service)-[:CONNECTS_TO]->(db:Database) RETURN s.name, db.name`);
  const [playgroundResult, setPlaygroundResult] = useState<any>(null);
  const [isRunningPlayground, setIsRunningPlayground] = useState(false);

  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/falkor/status')
        .then(res => res.json())
        .then(data => {
          setFalkorStatus(data);
        })
        .catch(() => {});
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRunPlayground = async () => {
    setIsRunningPlayground(true);
    try {
      const res = await fetch('/api/falkor/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cypher: playgroundQuery })
      });
      const data = await res.json();
      if (res.status === 401) {
        setPlaygroundResult({ error: 'Authorize the Incident Commander session to run live Cypher.' });
        setIsModalOpen(true);
        return;
      }
      setPlaygroundResult(data);
    } catch {
      setPlaygroundResult({ error: 'Connection failed' });
    } finally {
      setIsRunningPlayground(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Clearance Access Gate Modal */}
      <ClearanceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Navigation Header */}
      <header className="border-b-3 border-[var(--border-color)] bg-[var(--bg-surface)] px-4 md:px-8 py-3.5 sticky top-0 z-30 shadow-[var(--voxel-shadow)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00FF66] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <ShieldAlert className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base md:text-lg tracking-wider text-[var(--text-primary)]">
                  BLASTSHIELD<span className="text-[#00FF66]">.AI</span>
                </span>
                <VoxelBadge status="ENTERPRISE EDITION" size="sm" />
              </div>
              <div className="text-[10px] font-mono text-[var(--text-secondary)] hidden md:block">
                AUTONOMOUS CLOUD INCIDENT COMMANDER
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live FalkorDB Connectivity Indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-color)] px-2.5 py-1 text-xs font-mono shadow-[2px_2px_0px_#000]">
              <span className={`w-2.5 h-2.5 rounded-none ${falkorStatus?.connected ? 'bg-[#00FF66] shadow-[0_0_8px_#00FF66]' : 'bg-[#ff3366]'}`} />
              <span className="font-bold">FALKORDB:</span>
              <span className="text-[var(--text-secondary)]">
                {falkorStatus?.connected ? `ONLINE (${falkorStatus.latencyMs}ms)` : 'CONNECTING...'}
              </span>
            </div>

            <VoxelThemeToggle />

            {/* Launch Console CTA (Opens Clearance Gate) */}
            <VoxelButton
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ACCESS CONSOLE</span>
            </VoxelButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-16">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[var(--bg-surface)] border-3 border-[var(--border-color)] px-3 py-1 shadow-[2px_2px_0px_#000]">
            <Cpu className="w-4 h-4 text-[#00FF66]" />
            <span className="text-xs font-mono font-black uppercase tracking-widest text-[var(--text-primary)]">
              ZERO-TRUST GRAPHBLAS TOPOLOGY REASONING ENGINE
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[var(--text-primary)] leading-tight">
            STOP CLOUD CASCADES WITH{' '}
            <span className="bg-[#00FF66] text-black px-2 py-0.5 inline-block border-3 border-black shadow-[4px_4px_0px_#000]">
              GRAPH-NATIVE
            </span>{' '}
            REASONING
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] font-mono max-w-2xl mx-auto leading-relaxed">
            When production catches fire, standard LLMs hallucinate and vector embeddings fail on multi-hop dependencies. BlastShield AI computes deterministic topological blast radius and provable cut-vertices before executing surgical mitigations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <VoxelButton
              variant="primary"
              size="lg"
              onClick={() => setIsModalOpen(true)}
              className="gap-2.5 text-sm md:text-base font-black tracking-wider"
            >
              <Lock className="w-4 h-4" />
              <span>ENTER COMMAND CONSOLE</span>
              <ArrowRight className="w-4 h-4" />
            </VoxelButton>

            <a
              href="#benchmark"
              className="voxel-btn bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm md:text-base px-6 py-3 border-3 border-[var(--border-color)] shadow-[var(--voxel-shadow)] hover:bg-[#00FF66]/10 flex items-center gap-2"
            >
              <Activity className="w-4 h-4 text-[#00FF66]" />
              <span>VIEW BENCHMARKS</span>
            </a>
          </div>

          <div className="text-[11px] font-mono text-[var(--text-secondary)]">
            * Direct public entry is secured behind the Security Clearance Gate.
          </div>
        </div>

        {/* Live FalkorDB Cluster Telemetry Card */}
        <div className="voxel-box bg-[var(--bg-surface)] p-5 border-4 border-black dark:border-[#00FF66] shadow-[var(--voxel-shadow-lg)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-[var(--border-color)] pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-[#00FF66]" />
              <h2 className="font-black text-sm md:text-base uppercase tracking-wider">
                PRODUCTION FALKORDB INSTANCE TELEMETRY
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <VoxelBadge status={falkorStatus?.connected ? 'HEALTHY' : 'CONNECTING'} size="sm" />
              <span className="font-mono text-xs bg-black text-[#00FF66] px-2 py-0.5 border border-black shadow-[1px_1px_0px_#00FF66]">
                127.0.0.1:6379
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-surface-elevated)] p-3 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">TOPOLOGY STATE</div>
              <div className="text-lg font-black text-[#00FF66]">
                {falkorStatus?.connected ? 'ONLINE (ACTIVE)' : 'CONNECTING...'}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                {falkorStatus?.version || 'FalkorDB 4.22.1'}
              </div>
            </div>

            <div className="bg-[var(--bg-surface-elevated)] p-3 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">MANAGED ENTITIES</div>
              <div className="text-lg font-black text-[var(--text-primary)]">
                {falkorStatus?.nodeCount || 21} Nodes
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                Microservices, DBs, IAM, Pods
              </div>
            </div>

            <div className="bg-[var(--bg-surface-elevated)] p-3 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">INTERCONNECT EDGES</div>
              <div className="text-lg font-black text-[var(--text-primary)]">
                {falkorStatus?.edgeCount || 24} Relations
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                CALLS, PERMITS, ASSUMES
              </div>
            </div>

            <div className="bg-[var(--bg-surface-elevated)] p-3 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">QUERY LATENCY</div>
              <div className="text-lg font-black text-[#00FF66]">
                {falkorStatus?.connected ? `${falkorStatus.latencyMs} ms` : '—'}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                Measured on the live connection
              </div>
            </div>
          </div>
        </div>

        {/* Section: Evidence dashboard */}
        <section id="benchmark" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black uppercase text-[var(--text-primary)]">
              EVIDENCE, NOT CLAIMS
            </h2>
            <p className="text-xs md:text-sm font-mono text-[var(--text-secondary)] max-w-xl mx-auto">
              Every incident decision is backed by a live graph query, a reproducible cut analysis, and an approval-gated mutation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="voxel-box bg-[var(--bg-surface)] p-4 border-3 border-[var(--border-color)] shadow-[var(--voxel-shadow)]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">LIVE EVIDENCE</div>
              <div className="text-lg font-black text-[#00FF66] mt-1">FalkorDB traversal</div>
              <div className="text-xs font-mono text-[var(--text-secondary)] mt-2">Variable-length Cypher paths are returned to KIMO before it decides.</div>
            </div>
            <div className="voxel-box bg-[var(--bg-surface)] p-4 border-3 border-[var(--border-color)] shadow-[var(--voxel-shadow)]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">REAL ALGORITHM</div>
              <div className="text-lg font-black text-[#00FF66] mt-1">Tarjan articulation</div>
              <div className="text-xs font-mono text-[var(--text-secondary)] mt-2">Cut candidates are derived from the current topology, not a node-type lookup.</div>
            </div>
            <div className="voxel-box bg-[var(--bg-surface)] p-4 border-3 border-[var(--border-color)] shadow-[var(--voxel-shadow)]">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">SAFE ACTIONS</div>
              <div className="text-lg font-black text-[#00FF66] mt-1">Approval required</div>
              <div className="text-xs font-mono text-[var(--text-secondary)] mt-2">The agent can propose a change, but only the Commander can authorize mutation.</div>
            </div>
          </div>
        </section>

        {/* Section: Live Cypher Playground on Homepage */}
        <section className="voxel-box bg-[var(--bg-surface)] p-6 space-y-4 border-3 border-[var(--border-color)] shadow-[var(--voxel-shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#00FF66]" />
              <h3 className="font-black text-sm uppercase tracking-wider">
                LIVE FALKORDB CYPHER PLAYGROUND
              </h3>
            </div>
            <VoxelBadge status="ONLINE LIVE QUERY" size="sm" />
          </div>

          <p className="text-xs font-mono text-[var(--text-secondary)]">
            Test OpenCypher queries directly against the live database instance on port 6379:
          </p>

          <div className="space-y-2">
            <textarea
              value={playgroundQuery}
              onChange={(e) => setPlaygroundQuery(e.target.value)}
              rows={2}
              className="w-full bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-color)] p-2.5 text-xs font-mono focus:outline-none focus:border-[#00FF66]"
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                Click Run to query live FalkorDB instance.
              </span>
              <VoxelButton
                variant="primary"
                size="sm"
                onClick={handleRunPlayground}
                disabled={isRunningPlayground}
                className="gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isRunningPlayground ? 'RUNNING...' : 'EXECUTE CYPHER'}
              </VoxelButton>
            </div>
          </div>

          {playgroundResult && (
            <div className="p-3 bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] text-xs font-mono space-y-1">
              <div className="flex justify-between text-[10px] text-[#00FF66] font-bold">
                <span>QUERY EXECUTED IN {playgroundResult.executionTimeMs ?? '—'} ms</span>
                <span>RECORDS: {playgroundResult.records?.length || 0}</span>
              </div>
              <pre className="text-[11px] overflow-x-auto text-[var(--text-primary)]">
                {JSON.stringify(playgroundResult.records?.slice(0, 4) || playgroundResult, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* 4-Step Autonomous Mitigation Workflow */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black uppercase text-[var(--text-primary)]">
              AUTONOMOUS 4-STEP AGENT CYCLE
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="voxel-box bg-[var(--bg-surface)] p-4 space-y-2">
              <div className="font-mono font-black text-xs text-[#00FF66] bg-black px-2 py-0.5 inline-block">
                STEP 01
              </div>
              <h3 className="font-black text-sm uppercase">INGEST ANOMALY</h3>
              <p className="text-xs font-mono text-[var(--text-secondary)]">
                Starts from a live graph incident target and keeps the affected entity explicit throughout the decision loop.
              </p>
            </div>

            <div className="voxel-box bg-[var(--bg-surface)] p-4 space-y-2">
              <div className="font-mono font-black text-xs text-[#00FF66] bg-black px-2 py-0.5 inline-block">
                STEP 02
              </div>
              <h3 className="font-black text-sm uppercase">TRAVERSE GRAPH</h3>
              <p className="text-xs font-mono text-[var(--text-secondary)]">
                Executes multi-hop Cypher traversal in FalkorDB to discover all reachable downstream services and secret keys.
              </p>
            </div>

            <div className="voxel-box bg-[var(--bg-surface)] p-4 space-y-2">
              <div className="font-mono font-black text-xs text-[#00FF66] bg-black px-2 py-0.5 inline-block">
                STEP 03
              </div>
              <h3 className="font-black text-sm uppercase">PROVE CUT-VERTEX</h3>
              <p className="text-xs font-mono text-[var(--text-secondary)]">
                Runs a live FalkorDB traversal and Tarjan articulation analysis, then measures ingress reachability before and after the candidate cut.
              </p>
            </div>

            <div className="voxel-box bg-[var(--bg-surface)] p-4 space-y-2">
              <div className="font-mono font-black text-xs text-[#00FF66] bg-black px-2 py-0.5 inline-block">
                STEP 04
              </div>
              <h3 className="font-black text-sm uppercase">SURGICAL REMEDY</h3>
              <p className="text-xs font-mono text-[var(--text-secondary)]">
                Applies real Cypher mutations to quarantine the node, severs dangerous permissions, and writes the audit hash.
              </p>
            </div>
          </div>
        </section>

        {/* Evidence Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="voxel-box bg-[var(--bg-surface)] p-3 border-2 border-[var(--border-color)]">
            <div className="text-xs font-black">SHA-256 AUDIT</div>
            <div className="text-[10px] text-[var(--text-secondary)] font-mono">Persisted in FalkorDB</div>
          </div>
          <div className="voxel-box bg-[var(--bg-surface)] p-3 border-2 border-[var(--border-color)]">
            <div className="text-xs font-black">APPROVAL GATE</div>
            <div className="text-[10px] text-[var(--text-secondary)] font-mono">No silent mutations</div>
          </div>
          <div className="voxel-box bg-[var(--bg-surface)] p-3 border-2 border-[var(--border-color)]">
            <div className="text-xs font-black">MULTI-HOP GRAPH</div>
            <div className="text-[10px] text-[var(--text-secondary)] font-mono">Evidence at decision time</div>
          </div>
          <div className="voxel-box bg-[var(--bg-surface)] p-3 border-2 border-[var(--border-color)]">
            <div className="text-xs font-black">FALKORDB LIVE</div>
            <div className="text-[10px] text-[var(--text-secondary)] font-mono">Redis graph engine</div>
          </div>
        </div>

        {/* Access Gateway Bottom Banner */}
        <div className="voxel-box bg-[var(--bg-surface-elevated)] border-4 border-black dark:border-[#00FF66] p-8 text-center space-y-4 shadow-[var(--voxel-shadow-lg)]">
          <h2 className="text-2xl md:text-3xl font-black uppercase text-[var(--text-primary)]">
            READY TO COMMAND CLOUD TOPOLOGY?
          </h2>
          <p className="text-xs md:text-sm font-mono text-[var(--text-secondary)] max-w-xl mx-auto">
            Authorize your clearance key to unlock the Autonomous Incident Commander console with live FalkorDB queries, real-time 3D voxel topology, and automated blast mitigation.
          </p>
          <VoxelButton
            variant="primary"
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="gap-2 mx-auto"
          >
            <Lock className="w-4 h-4" />
            <span>AUTHORIZE CLEARANCE & LAUNCH CONSOLE</span>
          </VoxelButton>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-[var(--border-color)] bg-[var(--bg-surface)] px-4 md:px-8 py-5 mt-16 text-center text-xs font-mono text-[var(--text-secondary)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#00FF66] border border-black inline-block" />
            <span className="font-bold text-[var(--text-primary)]">BlastShield AI</span> — Autonomous Cloud Incident Commander
          </div>
          <div>
             Built with FalkorDB, Redis Protocol, Next.js, and a tool-using agent.
          </div>
        </div>
      </footer>
    </div>
  );
}
