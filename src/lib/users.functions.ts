import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) {
    throw new Error("Acesso restrito a administradores.");
  }
}

const CreateInput = z.object({
  email: z.string().email().max(255),
  full_name: z.string().min(1).max(120),
  matricula: z.string().max(50).optional().nullable(),
  cpf: z.string().max(20).optional().nullable(),
  turma: z.string().max(50).optional().nullable(),
  role: z.enum(["aluno", "professor", "admin"]),
  tag_uid: z.string().max(100).optional().nullable(),
  prof_turma: z.string().max(50).optional().nullable(),
  prof_room_id: z.string().uuid().optional().nullable(),
  redirectTo: z.string().url(),
});

export const createUserInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        matricula: data.matricula ?? "",
        cpf: data.cpf ?? "",
        turma: data.turma ?? "",
      },
    });
    if (error || !created.user) throw new Error(error?.message || "Falha ao criar usuário");
    const uid = created.user.id;

    // Trigger handle_new_user já criou profile + role 'aluno'.
    if (data.role !== "aluno") {
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    }

    if (data.role === "professor" && (data.prof_turma || data.prof_room_id)) {
      await supabaseAdmin.from("professor_assignments").insert({
        user_id: uid,
        turma: data.prof_turma || null,
        room_id: data.prof_room_id || null,
      });
    }

    if (data.tag_uid) {
      const { data: existing } = await supabaseAdmin
        .from("tags").select("id").eq("tag_uid", data.tag_uid).maybeSingle();
      if (existing) {
        await supabaseAdmin.from("tags").update({ user_id: uid, active: true }).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("tags").insert({ tag_uid: data.tag_uid, user_id: uid });
      }
      await supabaseAdmin.from("tag_scans").update({ consumed: true })
        .eq("tag_uid", data.tag_uid).eq("consumed", false);
    }

    const { data: link } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo: data.redirectTo },
    });

    return {
      user_id: uid,
      action_link: link?.properties?.action_link ?? null,
    };
  });

export const updateUserTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      tag_uid: z.string().min(1).max(100),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // Desvincula tags anteriores do usuário
    await supabaseAdmin.from("tags").update({ active: false, user_id: null }).eq("user_id", data.user_id);
    const { data: existing } = await supabaseAdmin
      .from("tags").select("id").eq("tag_uid", data.tag_uid).maybeSingle();
    if (existing) {
      await supabaseAdmin.from("tags").update({ user_id: data.user_id, active: true }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("tags").insert({ tag_uid: data.tag_uid, user_id: data.user_id });
    }
    await supabaseAdmin.from("tag_scans").update({ consumed: true })
      .eq("tag_uid", data.tag_uid).eq("consumed", false);
    return { ok: true };
  });

export const simulateTagScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tag_uid: z.string().min(1).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("registros_rfid").insert({ tag_uid: data.tag_uid });
    return { ok: true };
  });

const UpdateInput = z.object({
  user_id: z.string().uuid(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(6).max(72).optional().or(z.literal("")),
  full_name: z.string().min(1).max(120).optional(),
  matricula: z.string().max(50).optional().nullable(),
  cpf: z.string().max(20).optional().nullable(),
  turma: z.string().max(50).optional().nullable(),
});

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const authUpdate: { email?: string; password?: string } = {};
    if (data.email) authUpdate.email = data.email;
    if (data.password && data.password.length > 0) authUpdate.password = data.password;
    if (Object.keys(authUpdate).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, authUpdate);
      if (error) throw new Error(error.message);
    }

    const profileUpdate: Record<string, unknown> = {};
    if (data.full_name !== undefined) profileUpdate.full_name = data.full_name;
    if (data.matricula !== undefined) profileUpdate.matricula = data.matricula;
    if (data.cpf !== undefined) profileUpdate.cpf = data.cpf;
    if (data.turma !== undefined) profileUpdate.turma = data.turma;
    if (data.email !== undefined) profileUpdate.email = data.email;
    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(profileUpdate as never).eq("id", data.user_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
