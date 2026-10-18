'use client';

import React, { useRef, useEffect, useState } from 'react';
import { GraphNode, GraphEdge, BlastRadiusReport } from '@/lib/types';
import { ZoomIn, ZoomOut, RotateCcw, ShieldAlert, Cpu, Database, Key, Server, Layers, Move } from 'lucide-react';
import VoxelBadge from './VoxelBadge';
import { playTacticalClick } from '@/lib/audio';

interface VoxelGraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  blastReport: BlastRadiusReport | null;
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
  onTriggerIncidentOnNode?: (node: GraphNode) => void;
  isDark?: boolean;
}

export default function VoxelGraphCanvas({
  nodes,
  edges,
  blastReport,
  selectedNode,
  onSelectNode,
  onTriggerIncidentOnNode,
  isDark = false,
}: VoxelGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // State for individually draggable nodes
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Layout node positions with user custom draggable offsets
  const nodePositions = React.useMemo(() => {
    const posMap = new Map<string, { x: number; y: number; z: number }>();
    
    const layoutConfig: Record<string, { x: number; y: number; z: number }> = {
      'gw-ingress': { x: 400, y: 110, z: 30 },
      'lb-auth': { x: 260, y: 210, z: 20 },
      'lb-pay': { x: 540, y: 210, z: 20 },

      'pod-auth-x92': { x: 180, y: 310, z: 15 },
      'pod-auth-y81': { x: 300, y: 310, z: 15 },
      'svc-auth': { x: 240, y: 410, z: 25 },
      
      'pod-pay-k41': { x: 540, y: 310, z: 15 },
      'svc-payment': { x: 540, y: 410, z: 25 },

      'svc-users': { x: 700, y: 310, z: 20 },
      'svc-inventory': { x: 420, y: 410, z: 20 },
      'svc-notif': { x: 740, y: 430, z: 15 },

      'db-users-pri': { x: 180, y: 550, z: 35 },
      'db-users-rep': { x: 320, y: 550, z: 30 },
      'redis-session': { x: 100, y: 450, z: 20 },
      'db-aurora-pay': { x: 480, y: 550, z: 35 },

      'iam-auth-token': { x: 80, y: 290, z: 15 },
      'iam-payment-role': { x: 680, y: 450, z: 15 },
      'iam-admin-infra': { x: 820, y: 210, z: 15 },

      'sec-jwt-private': { x: 60, y: 190, z: 15 },
      'sec-stripe-live': { x: 680, y: 570, z: 20 },
      'sec-db-master': { x: 820, y: 330, z: 20 },
    };

    nodes.forEach((node, idx) => {
      let base = layoutConfig[node.id];
      if (!base) {
        const col = idx % 5;
        const row = Math.floor(idx / 5);
        base = { x: 150 + col * 160, y: 150 + row * 130, z: 20 };
      }

      // If user dragged this node, apply custom offset
      if (customPositions[node.id]) {
        posMap.set(node.id, {
          x: customPositions[node.id].x,
          y: customPositions[node.id].y,
          z: base.z
        });
      } else {
        posMap.set(node.id, base);
      }
    });

    return posMap;
  }, [nodes, customPositions]);

  // Animation frame loop with idle bobbing & energy pulses
  useEffect(() => {
    let animationFrameId: number;
    let pulseProgress = 0;
    let time = 0;

    const render = () => {
      time += 16;
      pulseProgress = (pulseProgress + 0.012) % 1;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(pan.x + width / 2, pan.y + height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-450, -320);

      // 1. Matrix Grid Floor
      const gridColor = isDark ? 'rgba(0, 255, 102, 0.07)' : 'rgba(0, 0, 0, 0.06)';
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = -100; x <= 1000; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -50);
        ctx.lineTo(x, 700);
        ctx.stroke();
      }
      for (let y = -50; y <= 700; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-100, y);
        ctx.lineTo(1000, y);
        ctx.stroke();
      }

      // Check blast radius paths
      const blastEdgeSet = new Set<string>();
      if (blastReport) {
        blastReport.blastPathEdges.forEach(e => {
          blastEdgeSet.add(`${e.source}->${e.target}`);
        });
      }

      // 2. Stepped Conduits (Edges)
      edges.forEach((edge) => {
        const fromPos = nodePositions.get(edge.source);
        const toPos = nodePositions.get(edge.target);
        if (!fromPos || !toPos) return;

        const isBlast = blastEdgeSet.has(`${edge.source}->${edge.target}`) || 
                        blastEdgeSet.has(`${edge.target}->${edge.source}`);

        ctx.lineWidth = isBlast ? 3.5 : 2;
        if (isBlast) {
          ctx.strokeStyle = '#ff3366';
        } else {
          ctx.strokeStyle = isDark ? 'rgba(0, 255, 102, 0.35)' : '#000000';
        }

        const midY = (fromPos.y + toPos.y) / 2;
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(fromPos.x, midY);
        ctx.lineTo(toPos.x, midY);
        ctx.lineTo(toPos.x, toPos.y);
        ctx.stroke();

        // Animated double particle wave along active edges
        for (let offset = 0; offset <= 0.5; offset += 0.5) {
          const prog = (pulseProgress + offset) % 1;
          const px = fromPos.x + (toPos.x - fromPos.x) * prog;
          const py = fromPos.y + (toPos.y - fromPos.y) * prog;

          ctx.fillStyle = isBlast ? '#ff0033' : '#00FF66';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.fillRect(px - 3, py - 3, 6, 6);
          ctx.strokeRect(px - 3, py - 3, 6, 6);
        }
      });

      // 3. Draw Nodes with Dragging & Smooth Floating Bobbing
      nodes.forEach((node) => {
        const basePos = nodePositions.get(node.id);
        if (!basePos) return;

        const isBeingDragged = draggedNodeId === node.id;
        // Don't apply bobbing while being dragged
        const bobOffset = isBeingDragged ? 0 : Math.sin(time * 0.002 + basePos.x * 0.05) * 3;
        const currentY = basePos.y + bobOffset;

        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isCompromised = node.status === 'COMPROMISED' || blastReport?.sourceNode.id === node.id;
        const isAtRisk = node.status === 'AT_RISK' || blastReport?.impactedNodes.some(n => n.id === node.id);
        const isQuarantined = node.status === 'QUARANTINED';
        const isFailover = node.status === 'FAILOVER';

        const size = node.tier === 1 ? 32 : 26;

        // Base Pedestal on the floor
        ctx.strokeStyle = isCompromised ? 'rgba(255, 51, 102, 0.5)' : 'rgba(0, 255, 102, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(basePos.x - size / 2 - 4, basePos.y - size / 2 + size - 2, size + 8, 8);

        // Node Face Colors
        let topColor = '#ffffff';
        let frontColor = '#e2e8f0';
        let sideColor = '#cbd5e1';
        let strokeColor = '#000000';

        if (isCompromised) {
          topColor = '#ff3366';
          frontColor = '#cc0033';
          sideColor = '#990026';
        } else if (isAtRisk) {
          topColor = '#ffb703';
          frontColor = '#fb8500';
          sideColor = '#d46b00';
        } else if (isQuarantined) {
          topColor = '#9333ea';
          frontColor = '#7e22ce';
          sideColor = '#6b21a8';
          strokeColor = '#00FF66';
        } else if (isFailover) {
          topColor = '#3b82f6';
          frontColor = '#2563eb';
          sideColor = '#1d4ed8';
        } else if (node.type === 'Database') {
          topColor = '#00FF66';
          frontColor = '#00cc52';
          sideColor = '#00993d';
        } else if (node.type === 'IAMRole') {
          topColor = '#facc15';
          frontColor = '#eab308';
          sideColor = '#ca8a04';
        } else if (isDark) {
          topColor = '#1e293b';
          frontColor = '#0f172a';
          sideColor = '#020617';
          strokeColor = '#00FF66';
        }

        const half = size / 2;
        const x = basePos.x - half;
        const y = currentY - half;

        // Front Face
        ctx.fillStyle = frontColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isSelected || isBeingDragged ? 3 : 2;
        ctx.beginPath();
        ctx.rect(x, y, size, size);
        ctx.fill();
        ctx.stroke();

        // Top Ledge
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 6, y - 6);
        ctx.lineTo(x + size + 6, y - 6);
        ctx.lineTo(x + size, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Side Face
        ctx.fillStyle = sideColor;
        ctx.beginPath();
        ctx.moveTo(x + size, y);
        ctx.lineTo(x + size + 6, y - 6);
        ctx.lineTo(x + size + 6, y + size - 6);
        ctx.lineTo(x + size, y + size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dragging / Selection Halo
        if (isSelected || isHovered || isBeingDragged) {
          ctx.strokeStyle = isBeingDragged ? '#ffb703' : '#00FF66';
          ctx.lineWidth = isBeingDragged ? 4 : 3;
          ctx.strokeRect(x - 5, y - 10, size + 16, size + 16);
        }

        // Animated Beacon on Compromised / Quarantined nodes
        if (isCompromised) {
          const pulse = Math.sin(time * 0.008) * 4;
          ctx.fillStyle = '#ff0033';
          ctx.fillRect(basePos.x - 2, y - 14 - pulse, 4, 8);
        }

        // Node Label
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = isDark ? '#ffffff' : '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, basePos.x, currentY + size / 2 + 16);

        // Status pill
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = isCompromised ? '#ff0033' : isAtRisk ? '#ffb703' : isQuarantined ? '#9333ea' : '#00FF66';
        ctx.fillText(`[${node.status}]`, basePos.x, currentY + size / 2 + 28);
      });

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, edges, blastReport, selectedNode, hoveredNode, pan, zoom, isDark, nodePositions, draggedNodeId]);

  // Coordinate conversion helper
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    const mouseX = (clientX - rect.left) * scaleX;
    const mouseY = (clientY - rect.top) * scaleY;

    const centerOffsetX = pan.x + canvas.width / 2;
    const centerOffsetY = pan.y + canvas.height / 2;

    const canvasX = (mouseX - centerOffsetX) / zoom + 450;
    const canvasY = (mouseY - centerOffsetY) / zoom + 320;

    return { x: canvasX, y: canvasY };
  };

  const getNodeAtCoords = (clientX: number, clientY: number): GraphNode | null => {
    const { x: canvasX, y: canvasY } = getCanvasCoords(clientX, clientY);

    for (const node of nodes) {
      const pos = nodePositions.get(node.id);
      if (pos) {
        const dist = Math.hypot(canvasX - pos.x, canvasY - pos.y);
        if (dist <= 28) {
          return node;
        }
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const hit = getNodeAtCoords(e.clientX, e.clientY);
    if (hit) {
      playTacticalClick();
      // Start dragging this specific node!
      setDraggedNodeId(hit.id);
      onSelectNode(hit);
    } else {
      // Dragging empty canvas space -> Pan canvas
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      // Move individual dragged node
      const { x: canvasX, y: canvasY } = getCanvasCoords(e.clientX, e.clientY);
      setCustomPositions(prev => ({
        ...prev,
        [draggedNodeId]: { x: Math.round(canvasX), y: Math.round(canvasY) }
      }));
    } else if (isPanning) {
      // Pan whole canvas
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else {
      // Update hover state
      const hit = getNodeAtCoords(e.clientX, e.clientY);
      setHoveredNode(hit);
    }
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  const handleResetPositions = () => {
    setCustomPositions({});
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-[540px] bg-[var(--bg-surface)] border-3 border-[var(--border-color)] shadow-[var(--voxel-shadow)] overflow-hidden select-none">
      {/* Top Header Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <VoxelBadge status="LIVE TOPOLOGY MESH" size="sm" />
        <span className="text-[10px] font-mono font-bold bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-color)] px-2 py-0.5">
          NODES: {nodes.length} | EDGES: {edges.length}
        </span>
        <span className="text-[10px] font-mono text-[var(--text-secondary)] hidden sm:flex items-center gap-1 bg-[var(--bg-surface-elevated)] px-2 py-0.5 border border-[var(--border-color)]">
          <Move className="w-3 h-3 text-[#00FF66]" /> DRAG NODES TO REARRANGE
        </span>
      </div>

      {/* Floating View Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[var(--bg-surface-elevated)] p-1 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_#000]">
        <button
          onClick={() => setZoom(z => Math.min(z + 0.15, 2.2))}
          className="p-1 hover:bg-[#00FF66]/20 font-bold text-xs cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
          className="p-1 hover:bg-[#00FF66]/20 font-bold text-xs cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetPositions}
          className="p-1 hover:bg-[#00FF66]/20 font-bold text-xs cursor-pointer"
          title="Reset Node Positions & Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Canvas */}
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full block ${
          draggedNodeId
            ? 'cursor-grabbing'
            : hoveredNode
            ? 'cursor-grab'
            : isPanning
            ? 'cursor-grabbing'
            : 'cursor-default'
        }`}
      />

      {/* Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 right-3 md:right-auto md:w-96 z-20 bg-[var(--bg-surface)] border-3 border-black dark:border-[#00FF66] p-3.5 shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#00FF66] animate-in slide-in-from-bottom duration-150">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#00FF66] border border-black" />
                <h4 className="font-black text-sm uppercase">{selectedNode.name}</h4>
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                ID: {selectedNode.id} | TYPE: {selectedNode.type}
              </div>
            </div>
            <VoxelBadge status={selectedNode.status} size="sm" />
          </div>

          <div className="grid grid-cols-3 gap-2 my-2.5 text-[10px] font-mono bg-[var(--bg-surface-elevated)] p-2 border-2 border-[var(--border-color)]">
            <div>
              <div className="text-[var(--text-secondary)]">TIER</div>
              <div className="font-black">Tier-{selectedNode.tier} {selectedNode.tier === 1 ? '(CRITICAL)' : ''}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)]">REGION</div>
              <div className="font-black">{selectedNode.region || 'us-east-1'}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)]">METRIC</div>
              <div className="font-black">
                {selectedNode.qps ? `${selectedNode.qps} QPS` : `${selectedNode.cpu_usage || 45}% CPU`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onTriggerIncidentOnNode && (
              <button
                onClick={() => onTriggerIncidentOnNode(selectedNode)}
                className="voxel-btn voxel-btn-danger text-[11px] py-1 px-3 flex items-center gap-1.5 flex-1 justify-center cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                TRIGGER ZERO-DAY INCIDENT
              </button>
            )}
            <button
              onClick={() => onSelectNode(null)}
              className="voxel-btn bg-[var(--bg-surface)] text-[11px] py-1 px-2.5 cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Footer Legend */}
      <div className="absolute bottom-2 right-2 hidden md:flex items-center gap-3 bg-[var(--bg-surface)]/90 backdrop-blur-xs px-2.5 py-1 border-2 border-[var(--border-color)] text-[10px] font-mono">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-[#00FF66] border border-black" />
          <span>HEALTHY</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-[#ff3366] border border-black" />
          <span>COMPROMISED</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-[#ffb703] border border-black" />
          <span>AT RISK</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-[#9333ea] border border-black" />
          <span>QUARANTINED</span>
        </div>
      </div>
    </div>
  );
}
