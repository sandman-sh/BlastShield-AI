'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, KeyRound, CheckCircle, Lock, Server, ArrowRight, X } from 'lucide-react';
import VoxelButton from './VoxelButton';
import VoxelBadge from './VoxelBadge';

interface ClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClearanceModal({ isOpen, onClose }: ClearanceModalProps) {
  const router = useRouter();
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [handshakeStatus, setHandshakeStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuthorize = async (useClusterHandshake = false) => {
    setIsVerifying(true);
    setError('');

    try {
      if (useClusterHandshake) {
        setHandshakeStatus('Pinging FalkorDB Cluster on 127.0.0.1:6379...');
      }

      const res = await fetch('/api/auth/clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(useClusterHandshake
          ? { mode: 'cluster' }
          : { mode: 'passkey', passkey: passkey.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (useClusterHandshake) {
          setHandshakeStatus(`Handshake verified! Latency: ${data.status?.latencyMs ?? 'n/a'}ms. FalkorDB node count: ${data.status?.nodeCount ?? 0}`);
        }
        sessionStorage.setItem('blastshield_clearance', JSON.stringify({
          granted: true,
          mode: data.mode,
          timestamp: new Date().toISOString()
        }));
        if (!useClusterHandshake) {
          setHandshakeStatus('Clearance authorized! Redirecting to Autonomous Command Console...');
        }
        setTimeout(() => {
          router.push('/app');
        }, 600);
      } else {
        setError(data.error || 'Clearance authorization failed.');
        setIsVerifying(false);
      }
    } catch (err: any) {
      setError(err.message || 'Authorization failed.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="voxel-box w-full max-w-lg bg-[var(--bg-surface)] border-4 border-black dark:border-[#00FF66] shadow-[8px_8px_0px_#000] dark:shadow-[8px_8px_0px_#00FF66] overflow-hidden">
        {/* Header with hazard striping */}
        <div className="bg-black text-[#00FF66] px-5 py-3 border-b-3 border-current flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#00FF66]" />
            <h2 className="font-black text-sm uppercase tracking-widest">
              SECURITY ACCESS CLEARANCE GATE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-[#00FF66] font-bold p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 bg-[var(--bg-surface-elevated)] p-3 border-2 border-[var(--border-color)]">
            <ShieldAlert className="w-6 h-6 text-[#ff3366] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-extrabold text-[var(--text-primary)] uppercase">
                RESTRICTED INCIDENT COMMANDER CONSOLE (/app)
              </div>
              <p className="text-[var(--text-secondary)]">
              Direct public entry from homepage is gated. Authorize the operator session with the server-side passkey or an active FalkorDB cluster handshake.
              </p>
            </div>
          </div>

          {/* Passkey Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-extrabold uppercase flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#00FF66]" />
                Incident Commander Passkey
              </label>
              <button
                type="button"
                onClick={() => setPasskey('BLASTSHIELD-ALPHA-77')}
                className="text-[10px] text-[#00FF66] dark:text-[#00FF66] font-bold underline cursor-pointer"
              >
                Auto-fill Clearance Passkey
              </button>
            </div>
            <input
              type="text"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="e.g. BLASTSHIELD-ALPHA-77"
              className="w-full bg-[var(--bg-surface)] border-3 border-[var(--border-color)] px-3 py-2 text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-[#00FF66] shadow-[2px_2px_0px_#000]"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-[#ff3366]/10 border-2 border-[#ff3366] text-[#ff3366] text-xs font-bold">
              ⚠ {error}
            </div>
          )}

          {handshakeStatus && (
            <div className="p-2.5 bg-[#00FF66]/15 border-2 border-[#00FF66] text-black dark:text-[#00FF66] text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-[#00FF66]" />
              {handshakeStatus}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <VoxelButton
              variant="primary"
              size="lg"
              className="w-full justify-center gap-2"
              onClick={() => handleAuthorize(false)}
              disabled={isVerifying}
            >
              {isVerifying ? 'VERIFYING CREDENTIALS...' : 'VERIFY PASSKEY & ENTER CONSOLE'}
              <ArrowRight className="w-4 h-4" />
            </VoxelButton>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t-2 border-[var(--border-color)]"></div>
              <span className="flex-shrink mx-3 text-[10px] font-black uppercase text-[var(--text-secondary)]">OR</span>
              <div className="flex-grow border-t-2 border-[var(--border-color)]"></div>
            </div>

            <VoxelButton
              variant="secondary"
              size="md"
              className="w-full justify-center gap-2"
              onClick={() => handleAuthorize(true)}
              disabled={isVerifying}
            >
              <Server className="w-4 h-4 text-[#00FF66]" />
              AUTHORIZE VIA LIVE FALKORDB CLUSTER HANDSHAKE
            </VoxelButton>
          </div>

          <div className="text-[10px] text-center text-[var(--text-secondary)] font-mono">
            CONNECTED TO FALKORDB HOST: <span className="font-bold text-black dark:text-[#00FF66]">127.0.0.1:6379</span> (GRAPH: blastshield_infra)
          </div>
        </div>
      </div>
    </div>
  );
}
