'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Terminal, ShieldAlert, CheckCircle2, RefreshCw, X, ChevronDown, ChevronUp, MessageSquare, Zap, Minimize2 } from 'lucide-react';
import VoxelBadge from './VoxelBadge';
import VoxelButton from './VoxelButton';
import { useTheme } from '@/lib/theme-context';
import { GraphNode, BlastRadiusReport, RemediationResult } from '@/lib/types';

interface KimoChatAssistantProps {
  onBlastRadiusUpdated: (report: BlastRadiusReport | null) => void;
  onRemediationApplied: () => void;
  onTopologyReset: () => void;
  selectedNode: GraphNode | null;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'kimo';
  text: string;
  timestamp: string;
  action?: any;
}

/**
 * Cleanly format text to eliminate raw asterisks (**) and render bold text, code, and lists
 */
function FormattedMessage({ text }: { text: string }) {
  // Split into lines
  const lines = text.split('\n');

  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1.5" />;

        // Check if line is a bullet
        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('* ');
        const cleanLine = isBullet ? trimmed.replace(/^[•\-\*]\s*/, '') : line;

        // Parse bold **text** and inline `code`
        const parts = [];
        const regex = /(\*\*.*?\*\*|`.*?`)/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(cleanLine)) !== null) {
          if (match.index > lastIndex) {
            parts.push(cleanLine.substring(lastIndex, match.index));
          }
          const token = match[0];
          if (token.startsWith('**') && token.endsWith('**')) {
            parts.push(
              <strong key={match.index} className="font-extrabold text-[#00FF66] dark:text-[#00FF66]">
                {token.slice(2, -2)}
              </strong>
            );
          } else if (token.startsWith('`') && token.endsWith('`')) {
            parts.push(
              <code key={match.index} className="bg-black/30 text-[#00FF66] px-1 py-0.5 border border-black/40 text-[11px] font-mono">
                {token.slice(1, -1)}
              </code>
            );
          }
          lastIndex = regex.lastIndex;
        }

        if (lastIndex < cleanLine.length) {
          parts.push(cleanLine.substring(lastIndex));
        }

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start gap-1.5 pl-1">
              <span className="text-[#00FF66] font-bold shrink-0 mt-0.5">▸</span>
              <span>{parts}</span>
            </div>
          );
        }

        return <div key={lIdx}>{parts}</div>;
      })}
    </div>
  );
}

export default function KimoChatAssistant({
  onBlastRadiusUpdated,
  onRemediationApplied,
  onTopologyReset,
  selectedNode,
  externalPrompt,
  onClearExternalPrompt
}: KimoChatAssistantProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'kimo',
      text: `Greetings, Commander. I am KIMO, your evidence-first incident commander.\n\nI use live FalkorDB traversals, articulation analysis, persistent memory, and approval-gated remediation. What shall we investigate?`,
      timestamp: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = [
    'Recall FalkorDB episodic memory',
    'Compute blast radius on auth-pod-x92',
    'Propose containment for pod-auth-x92',
    'Approve the last remediation plan',
    'Show all Tier-1 mission critical services',
    'Reset graph to baseline',
    'Switch to dark mode'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (externalPrompt) {
      setIsOpen(true);
      handleSend(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/kimo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          selectedNodeId: selectedNode?.id,
          history: [...messages, userMessage].map((item) => ({
            role: item.sender === 'user' ? 'user' : 'assistant',
            content: item.text,
          })),
        })
      });

      const data = await res.json();

      if (data.success) {
        const kimoMessage: ChatMessage = {
          id: `kimo-${Date.now()}`,
          sender: 'kimo',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: data.action
        };

        setMessages(prev => [...prev, kimoMessage]);

        // Execute frontend reactions based on KIMO's action
        if (data.action) {
          if (data.action.type === 'BLAST_RADIUS_COMPUTED') {
            onBlastRadiusUpdated(data.action.report);
          } else if (data.action.type === 'REMEDIATION_PROPOSED') {
            onBlastRadiusUpdated(data.action.proposal?.report || null);
          } else if (data.action.type === 'REMEDIATION_APPLIED') {
            onRemediationApplied();
          } else if (data.action.type === 'TOPOLOGY_RESET') {
            onTopologyReset();
          } else if (data.action.type === 'SWITCH_THEME') {
            setTheme(data.action.theme);
          }
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `kimo-${Date.now()}`,
            sender: 'kimo',
            text: `Commander, error executing command: ${data.error || 'Unknown failure'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `kimo-${Date.now()}`,
          sender: 'kimo',
          text: `Commander, network link to agent failed: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Corner Launcher Button (Always visible at bottom-right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 voxel-btn bg-black text-[#00FF66] border-3 border-[#00FF66] shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#00FF66] hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        >
          <div className="relative">
            <div className="w-6 h-6 bg-[#00FF66] border border-black flex items-center justify-center">
              <Bot className="w-4 h-4 text-black" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00FF66] rounded-full animate-ping" />
          </div>
          <div className="text-left font-mono">
            <div className="text-xs font-black tracking-wider text-[#00FF66]">KIMO AI COPILOT</div>
            <div className="text-[9px] text-white/70">AUTONOMOUS AI • FALKORDB</div>
          </div>
        </button>
      )}

      {/* Floating Corner Chat Window (When Open) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] sm:w-[420px] h-[520px] voxel-box bg-[var(--bg-surface)] border-3 border-black dark:border-[#00FF66] shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_#00FF66] flex flex-col overflow-hidden font-mono animate-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-black text-[#00FF66] px-4 py-2.5 flex items-center justify-between border-b-3 border-current">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-[#00FF66] border border-black flex items-center justify-center shadow-[1px_1px_0px_#fff]">
                <Bot className="w-4 h-4 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs uppercase tracking-widest text-[#00FF66]">
                    KIMO // AI COMMANDER
                  </span>
                  <span className="w-2 h-2 rounded-none bg-[#00FF66] inline-block animate-ping" />
                </div>
                <div className="text-[9px] text-white/70">
                  TOOL-USING SRE • LIVE FALKORDB
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-[#00FF66] p-1 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-[var(--bg-surface-elevated)] text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[9px] text-[var(--text-secondary)] mb-0.5 flex items-center gap-1 font-bold">
                  {msg.sender === 'user' ? 'YOU (COMMANDER)' : 'KIMO AI COPILOT'} • {msg.timestamp}
                </div>
                <div
                  className={`p-2.5 border-2 max-w-[90%] break-words ${
                    msg.sender === 'user'
                      ? 'bg-black text-[#00FF66] border-[#00FF66] shadow-[2px_2px_0px_#00FF66]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] shadow-[2px_2px_0px_#000]'
                  }`}
                >
                  <FormattedMessage text={msg.text} />
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-[10px] text-[#00FF66] bg-black p-2 border border-[#00FF66] w-fit shadow-[2px_2px_0px_#00FF66]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>KIMO is calling live graph tools...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Command Chips */}
          <div className="px-3 py-1.5 border-t border-[var(--border-color)] bg-[var(--bg-surface)] flex gap-1.5 overflow-x-auto text-[10px]">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="whitespace-nowrap bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] px-2 py-0.5 hover:border-[#00FF66] hover:bg-[#00FF66]/15 transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-2.5 border-t-2 border-[var(--border-color)] bg-[var(--bg-surface)] flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask KIMO e.g. 'Compute blast radius on auth-pod-x92'..."
              className="flex-1 bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-color)] px-3 py-1.5 text-xs focus:outline-none focus:border-[#00FF66] shadow-[1px_1px_0px_#000]"
            />
            <VoxelButton
              variant="primary"
              size="sm"
              onClick={() => handleSend()}
              disabled={isTyping || !input.trim()}
              className="gap-1.5 px-3"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SEND</span>
            </VoxelButton>
          </div>
        </div>
      )}
    </>
  );
}
