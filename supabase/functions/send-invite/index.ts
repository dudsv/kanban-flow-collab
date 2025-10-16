import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  projectId: string;
  inviterName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, projectId, inviterName }: InviteRequest = await req.json();

    console.log(`📧 Processing invite for ${email} to project ${projectId}`);

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Email inválido");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar se o projeto existe
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Projeto não encontrado");
    }

    // Criar token de convite único
    const inviteToken = crypto.randomUUID();

    // Salvar convite pendente (expira em 7 dias)
    const { error: inviteError } = await supabase.from("project_invites").insert({
      email,
      project_id: projectId,
      token: inviteToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
      throw new Error("Erro ao criar convite");
    }

    // Criar URL de convite
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
    const inviteUrl = `${appUrl}/register?invite=${inviteToken}`;

    console.log(`✅ Invite created: ${inviteUrl}`);

    // TODO: Integração com Resend para envio de email
    // Descomentar quando configurar RESEND_API_KEY
    /*
    const Resend = (await import("npm:resend@2.0.0")).Resend;
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    await resend.emails.send({
      from: "KanFlow <noreply@kanflow.app>",
      to: email,
      subject: `${inviterName} convidou você para ${project.name}`,
      html: `
        <h2>Você foi convidado!</h2>
        <p>${inviterName} convidou você para colaborar no projeto <strong>${project.name}</strong>.</p>
        <p><a href="${inviteUrl}" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Aceitar Convite</a></p>
        <p style="color: #666; font-size: 12px;">Este convite expira em 7 dias.</p>
      `,
    });
    */

    console.log(`📬 Email would be sent to: ${email}`);
    console.log(`📝 Invite URL: ${inviteUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        inviteUrl,
        message: "Convite criado com sucesso. Email será enviado quando Resend estiver configurado."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error in send-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
