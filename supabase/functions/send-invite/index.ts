import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  projectId: string;
  inviterName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, projectId, inviterName }: InviteRequest = await req.json();

    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error: inviteError } = await supabase
      .from("project_invites")
      .insert({
        email,
        project_id: projectId,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: null
      });

    if (inviteError) throw inviteError;

    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
    const inviteUrl = `${appUrl}/register?invite=${token}`;

    console.log(`Invite sent to ${email} for project ${project.name}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log(`Invited by: ${inviterName || 'Unknown'}`);

    return new Response(
      JSON.stringify({ ok: true, inviteUrl, message: 'Invite created successfully' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('Error in send-invite function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
