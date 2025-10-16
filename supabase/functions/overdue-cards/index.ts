import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar cards vencidos (due_at < now() e não deletados)
    const { data: overdueCards, error: cardsError } = await supabaseClient
      .from('cards')
      .select('id, title, project_id, due_at, card_assignees(user_id)')
      .lt('due_at', new Date().toISOString())
      .is('deleted_at', null);

    if (cardsError) throw cardsError;

    console.log(`Found ${overdueCards?.length || 0} overdue cards`);

    // Criar notificações para assignees
    const notifications = [];
    for (const card of overdueCards || []) {
      for (const assignee of card.card_assignees) {
        notifications.push({
          user_id: assignee.user_id,
          type: 'overdue',
          payload: {
            cardId: card.id,
            cardTitle: card.title,
            projectId: card.project_id,
            dueDate: card.due_at,
          },
        });
      }
    }

    if (notifications.length > 0) {
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert(notifications);

      if (notifError) throw notifError;

      console.log(`Created ${notifications.length} overdue notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdueCards: overdueCards?.length || 0,
        notificationsCreated: notifications.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in overdue-cards function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
