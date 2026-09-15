import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/server-supabase';
import { requireUserSession } from '@/server/user/auth';
import { isSameOriginRequest, sanitizePlainText } from '@/lib/security';
import { decideAgentReply } from '@/server/chat/agent';

type AgentRequestBody = {
  message?: string;
  sourceMessageId?: string;
};

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
    }

    const session = await requireUserSession();
    if (!session.ok) {
      return NextResponse.json({ success: false, message: session.message }, { status: 401 });
    }

    const body = (await request.json()) as AgentRequestBody;
    const userMessage = sanitizePlainText(String(body.message ?? ''), 500);

    if (!userMessage) {
      return NextResponse.json({ success: false, message: 'Message vide.' }, { status: 400 });
    }

    const db = await supabaseServer();

    const [{ data: profile }, pendingResult, challengeResult] = await Promise.all([
      db
        .from('profiles')
        .select('username, role, balance, jetons_cp, xp')
        .eq('id', session.userId)
        .maybeSingle(),
      db
        .from('transactions')
        .select('id, type', { count: 'exact', head: true })
        .eq('user_id', session.userId)
        .eq('status', 'pending'),
      db
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
    ]);

    const pendingDeposits = pendingResult.count ?? 0;
    const pendingWithdrawals = pendingResult.count ?? 0;

    const decision = decideAgentReply(userMessage, {
      username: profile?.username ?? null,
      role: profile?.role ?? null,
      balance: Number(profile?.balance ?? 0),
      jetonsCp: Number(profile?.jetons_cp ?? 0),
      xp: Number(profile?.xp ?? 0),
      pendingDeposits,
      pendingWithdrawals,
      activeChallenges: challengeResult.count ?? 0,
    });

    const { data: savedMessage, error: insertError } = await db
      .from('messages')
      .insert({
        user_id: session.userId,
        content: decision.replyContent,
        is_admin_message: true,
        is_read_by_admin: true,
        is_read_by_client: false,
      })
      .select('id, user_id, content, created_at, is_admin_message, is_read_by_admin, is_read_by_client')
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, message: 'Impossible de repondre pour le moment.' }, { status: 500 });
    }

    const { error: logError } = await db.from('chat_agent_logs').insert({
      user_id: session.userId,
      source_message_id: body.sourceMessageId ?? null,
      user_message: userMessage,
      agent_reply: decision.replyContent,
      action_type: decision.actionType,
      metadata: {
        role: profile?.role ?? null,
      },
    });

    if (logError) {
      console.error('[chat/agent] log insert failed:', logError.message);
    }

    const { error: memoryError } = await db.from('chat_agent_memory').upsert({
      user_id: session.userId,
      memory_key: 'last_topic',
      memory_value: decision.actionType,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,memory_key' });

    if (memoryError) {
      console.error('[chat/agent] memory upsert failed:', memoryError.message);
    }

    return NextResponse.json({
      success: true,
      message: savedMessage,
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Erreur serveur inattendue.' }, { status: 500 });
  }
}
