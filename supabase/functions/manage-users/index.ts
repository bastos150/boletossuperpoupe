import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UserRequest {
  email: string;
  password: string;
  nome: string;
  is_admin: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client with the service role key for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const { data: callerProfile, error: profileError } = await adminClient
      .from("user_profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !callerProfile || !callerProfile.is_admin) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem gerenciar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const method = req.method;
    const url = new URL(req.url);

    // GET: list all users with profiles
    if (method === "GET") {
      const { data: profiles, error: profilesError } = await adminClient
        .from("user_profiles")
        .select("id, email, nome, is_admin, created_at")
        .order("created_at", { ascending: true });

      if (profilesError) {
        return new Response(
          JSON.stringify({ error: "Erro ao buscar usuários" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ users: profiles }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: create a new user
    if (method === "POST") {
      const body: UserRequest = await req.json();

      if (!body.email || !body.password) {
        return new Response(
          JSON.stringify({ error: "Email e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check current user count (max 4)
      const { count, error: countError } = await adminClient
        .from("user_profiles")
        .select("id", { count: "exact", head: true });

      if (countError) {
        return new Response(
          JSON.stringify({ error: "Erro ao verificar limite de usuários" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (count >= 4) {
        return new Response(
          JSON.stringify({ error: "Limite de 4 usuários atingido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create the auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update the profile with nome and admin flag
      const { error: updateError } = await adminClient
        .from("user_profiles")
        .update({ nome: body.nome || body.email.split("@")[0], is_admin: body.is_admin || false })
        .eq("id", newUser.user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Usuário criado, mas erro ao definir perfil" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: "Usuário criado com sucesso", id: newUser.user.id }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT: update a user (password or profile)
    if (method === "PUT") {
      const body = await req.json();
      const userId = body.id;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "ID do usuário é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update password if provided
      if (body.password) {
        const { error: pwdError } = await adminClient.auth.admin.updateUserById(
          userId,
          { password: body.password }
        );
        if (pwdError) {
          return new Response(
            JSON.stringify({ error: pwdError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Update profile
      const updates: Record<string, unknown> = {};
      if (body.nome !== undefined) updates.nome = body.nome;
      if (body.is_admin !== undefined) updates.is_admin = body.is_admin;

      if (Object.keys(updates).length > 0) {
        const { error: profError } = await adminClient
          .from("user_profiles")
          .update(updates)
          .eq("id", userId);

        if (profError) {
          return new Response(
            JSON.stringify({ error: "Erro ao atualizar perfil" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ message: "Usuário atualizado com sucesso" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE: remove a user
    if (method === "DELETE") {
      const userId = url.searchParams.get("id");

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "ID do usuário é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userId === userData.user.id) {
        return new Response(
          JSON.stringify({ error: "Você não pode excluir seu próprio usuário" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: "Usuário excluído com sucesso" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Método não suportado" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
