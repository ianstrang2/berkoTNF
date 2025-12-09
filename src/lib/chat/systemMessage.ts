/**
 * System Message Helper
 * 
 * Posts automated system messages to the chat.
 * Uses Supabase client (not Prisma) to trigger Realtime events immediately.
 */

import { createClient } from '@supabase/supabase-js';

interface SystemMessageOptions {
  tenantId: string;
  content: string;
}

/**
 * Posts a system message to the chat.
 * Uses Supabase client (not Prisma) to trigger Realtime events.
 */
export async function postSystemMessage({ tenantId, content }: SystemMessageOptions): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase configuration for system message');
    throw new Error('Server configuration error: Missing Supabase credentials');
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      tenant_id: tenantId,
      content,
      is_system_message: true,
      author_player_id: null,
      mentions: []
    });
  
  if (error) {
    console.error('Failed to post system message:', error);
    throw error;
  }
  
  console.log(`[SYSTEM_MESSAGE] Posted to tenant ${tenantId}: "${content}"`);
}

/**
 * System message templates for common events
 */
export const SystemMessageTemplates = {
  matchReportLive: () => '📊 Match report is live!',
  votingOpen: (durationHours: number) => `🗳️ Voting is open! Closes in ${durationHours}h`,
  votingClosedWithAwards: () => '🏆 Voting closed — check the match report for awards!',
  votingClosedNoAwards: () => '🗳️ Voting closed — no awards this week',
  teamsPublished: (dayOfWeek: string) => `⚽ Teams published for ${dayOfWeek}'s match!`,
  playerJoined: (playerName: string) => `👋 Welcome ${playerName} to the club!`,
};

/**
 * Helper to get day of week name from a date
 */
export function getDayOfWeek(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

