import { NextResponse } from 'next/server';
import { hasClearance, unauthorized } from '@/lib/auth';
import {
  calculateBlastRadius,
  executeRemediation,
  getAgentMemories,
  getEntireTopology,
  getFalkorStatus,
  seedInfrastructure,
} from '@/lib/falkordb';
import { BlastRadiusReport, RemediationResult } from '@/lib/types';

const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY;
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const AI_MODEL = process.env.AI_MODEL || process.env.OPENROUTER_MODEL;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: unknown[];
};

const tools = [
  {
    type: 'function',
    function: {
      name: 'inspect_topology',
      description: 'Read the current live FalkorDB topology and connection status. Use this before making claims about infrastructure.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_blast_radius',
      description: 'Run a live FalkorDB multi-hop traversal and evidence-backed articulation-point analysis for a compromised node.',
      parameters: {
        type: 'object',
        properties: {
          sourceNodeId: { type: 'string', description: 'Exact graph node id.' },
          incidentCategory: { type: 'string', description: 'Incident category such as IAM_LEAK or DATA_EXFILTRATION.' },
        },
        required: ['sourceNodeId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recall_memory',
      description: 'Recall observed containment outcomes from AgentMemory nodes in FalkorDB.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Optional incident or node search term.' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_remediation',
      description: 'Prepare a remediation plan from the live graph. This never mutates FalkorDB and should be used before apply_remediation.',
      parameters: {
        type: 'object',
        properties: {
          sourceNodeId: { type: 'string' },
          action: { type: 'string', description: 'The action proposed by analyze_blast_radius.' },
        },
        required: ['sourceNodeId', 'action'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_remediation',
      description: 'Apply an approved remediation to live FalkorDB. Only call this when the latest user message explicitly approves, confirms, or asks to execute the proposed action.',
      parameters: {
        type: 'object',
        properties: {
          sourceNodeId: { type: 'string' },
          action: { type: 'string' },
          approval: { type: 'string', description: 'Quote the user approval phrase.' },
        },
        required: ['sourceNodeId', 'action', 'approval'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reset_topology',
      description: 'Reset the live demo graph to its deterministic baseline. Only call after explicit user approval.',
      parameters: { type: 'object', properties: { approval: { type: 'string' } }, required: ['approval'], additionalProperties: false },
    },
  },
];

function explicitApproval(message: string) {
  return /\b(approve|approved|confirm|confirmed|execute|apply|do it|yes)\b/i.test(message);
}

async function callModel(messages: ChatMessage[]) {
  if (!AI_API_KEY || !AI_MODEL) {
    throw new Error('AI agent is not configured. Set AI_API_KEY and AI_MODEL in .env.');
  }

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
      'X-Title': 'BlastShield AI KIMO',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 900,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`AI provider returned HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function runTool(name: string, args: any, userMessage: string) {
  switch (name) {
    case 'inspect_topology': {
      const [status, topology] = await Promise.all([getFalkorStatus(), getEntireTopology()]);
      return { status, nodeTypes: topology.nodes.reduce<Record<string, number>>((acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
      }, {}), nodes: topology.nodes, edges: topology.edges };
    }
    case 'analyze_blast_radius':
      return await calculateBlastRadius(String(args.sourceNodeId), String(args.incidentCategory || 'SECURITY_INCIDENT'));
    case 'recall_memory': {
      const memories = await getAgentMemories();
      const query = String(args.query || '').toLowerCase();
      return { memories: query ? memories.filter((memory) => JSON.stringify(memory).toLowerCase().includes(query)) : memories };
    }
    case 'propose_remediation': {
      const report = await calculateBlastRadius(String(args.sourceNodeId), 'SECURITY_INCIDENT');
      return {
        status: 'AWAITING_APPROVAL',
        sourceNodeId: args.sourceNodeId,
        action: args.action || report.cutVertices[0]?.action,
        report,
        evidence: report.analysis,
        proof: report.mathematicalSafetyProof,
        candidateCutVertices: report.analysis.candidateCutVertices,
        message: 'No graph mutation occurred. Ask the Commander for explicit approval before applying this plan.',
      };
    }
    case 'apply_remediation': {
      if (!explicitApproval(userMessage)) {
        return { status: 'BLOCKED', reason: 'Explicit approval is required before mutating FalkorDB.' };
      }
      return await executeRemediation(String(args.sourceNodeId), String(args.action || 'QUARANTINE_NODE'));
    }
    case 'reset_topology': {
      if (!explicitApproval(userMessage)) {
        return { status: 'BLOCKED', reason: 'Explicit approval is required before resetting the graph.' };
      }
      return await seedInfrastructure();
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(request: Request) {
  if (!hasClearance(request)) return unauthorized();

  try {
    const body = await request.json();
    const message = String(body.message || '').trim();
    const selectedNodeId = body.selectedNodeId ? String(body.selectedNodeId) : '';
    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history
        .filter((item: any) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
        .slice(-12)
        .map((item: any) => ({ role: item.role, content: item.content }))
      : [];

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required.' }, { status: 400 });
    }

    const lower = message.toLowerCase();
    if (lower.includes('dark mode') || lower.includes('night mode')) {
      return NextResponse.json({ success: true, reply: 'Switching console to dark mode.', action: { type: 'SWITCH_THEME', theme: 'dark' } });
    }
    if (lower.includes('light mode') || lower.includes('white mode')) {
      return NextResponse.json({ success: true, reply: 'Switching console to light mode.', action: { type: 'SWITCH_THEME', theme: 'light' } });
    }

    const system = `You are KIMO, an evidence-first SRE incident commander. You operate on a live FalkorDB graph.
Never invent nodes, counts, latency, algorithms, success rates, or safety guarantees. Use tools for every infrastructure fact.
The graph is the source of truth. Explain the exact node and relationship path behind decisions.
You may propose destructive actions, but you must not apply them until the user explicitly approves in the latest message.
Be concise but include evidence, decision, risk, and next action. Call analyze_blast_radius before proposing containment.
Selected node from the console: ${selectedNodeId || 'none'}.`;
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: message },
    ];

    let lastReport: BlastRadiusReport | null = null;
    let appliedResult: RemediationResult | null = null;
    let proposal: any = null;
    let finalText = '';

    for (let round = 0; round < 6; round += 1) {
      const result = await callModel(messages);
      const assistant = result.choices?.[0]?.message;
      if (!assistant) throw new Error('AI provider returned no assistant message.');
      messages.push(assistant);

      const calls = Array.isArray(assistant.tool_calls) ? assistant.tool_calls : [];
      if (!calls.length) {
        finalText = String(assistant.content || '').trim() || 'KIMO completed the analysis but returned no narrative.';
        break;
      }

      for (const call of calls) {
        const name = String(call.function?.name || '');
        let args: any = {};
        try { args = JSON.parse(call.function?.arguments || '{}'); } catch { args = {}; }
        const toolOutput = await runTool(name, args, message);
        if (name === 'analyze_blast_radius') lastReport = toolOutput as BlastRadiusReport;
        if (name === 'propose_remediation') proposal = toolOutput;
        if (name === 'apply_remediation' && toolOutput && !('status' in toolOutput)) appliedResult = toolOutput as RemediationResult;
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name,
          content: JSON.stringify(toolOutput),
        });
      }
    }

    if (!finalText) finalText = 'KIMO reached the tool-call limit. Ask for a concise evidence summary.';
    const action = appliedResult
      ? { type: 'REMEDIATION_APPLIED', result: appliedResult, targetNode: appliedResult.nodesModified[0] }
      : proposal
        ? { type: 'REMEDIATION_PROPOSED', proposal }
      : lastReport
        ? { type: 'BLAST_RADIUS_COMPUTED', report: lastReport }
        : { type: 'INFO' };

    return NextResponse.json({ success: true, reply: finalText, action, model: AI_MODEL, provider: AI_BASE_URL });
  } catch (error) {
    console.error('[KIMO agent error]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'KIMO failed to process the request.' },
      { status: 500 }
    );
  }
}
