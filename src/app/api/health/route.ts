import { connection, NextResponse } from 'next/server';
import { getFalkorStatus } from '@/lib/falkordb';

export async function GET() {
  await connection();
  const falkor = await getFalkorStatus();
  const agentConfigured = Boolean(
    (process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY) &&
    (process.env.AI_MODEL || process.env.OPENROUTER_MODEL)
  );

  return NextResponse.json({
    ok: falkor.connected && agentConfigured,
    service: 'blastshield-ai',
    agent: {
      configured: agentConfigured,
      baseUrl: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.AI_MODEL || process.env.OPENROUTER_MODEL || null,
    },
    falkor,
    checkedAt: new Date().toISOString(),
  }, { status: falkor.connected && agentConfigured ? 200 : 503 });
}
