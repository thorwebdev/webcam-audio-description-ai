// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from "jsr:@supabase/supabase-js@2.45.6";
import OpenAI from "https://deno.land/x/openai@v4.68.2/mod.ts";

const client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

globalThis.addEventListener("asyncTask", async (event) => {
  const { data, error } = await (event as CustomEvent<{
    storageUploadPromise: Promise<any>;
  }>).detail
    .storageUploadPromise;
  console.log({ data, error });
});

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const params = new URLSearchParams(url.search);
  const text = params.get("text");

  if (!text) {
    return new Response(
      JSON.stringify({ error: "Text parameter is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const response = await client.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
    });

    const stream = response.body;
    if (!stream) {
      throw new Error("No stream");
    }

    // Branch stream to Supabase Storage
    const [browserStream, storageStream] = stream.tee();

    // Upload to Supabase Storage
    const storageUploadPromise = supabase.storage
      .from("videos")
      .upload(`audio-stream_${Date.now()}.mp3`, storageStream, {
        contentType: "audio/mp3",
      });
    const event = new CustomEvent("asyncTask", {
      detail: { storageUploadPromise },
    });
    globalThis.dispatchEvent(event);

    return new Response(browserStream, {
      headers: {
        "Content-Type": "audio/mp3",
      },
    });
  } catch (error) {
    console.log("error", { error });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/tts-openai' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
