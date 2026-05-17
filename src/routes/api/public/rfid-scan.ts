import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Body = z.object({ tag_uid: z.string().min(1).max(100) });

export const Route = createFileRoute("/api/public/rfid-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-rfid-secret");
        const expected = process.env.RFID_INGEST_SECRET;
        if (!expected || secret !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        let json: unknown;
        try { json = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
        const parsed = Body.safeParse(json);
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const { error } = await supabaseAdmin.from("tag_scans").insert({ tag_uid: parsed.data.tag_uid });
        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
