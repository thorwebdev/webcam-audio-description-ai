import { ElevenLabsClient } from "npm:elevenlabs";

const client = new ElevenLabsClient({
  apiKey: Deno.env.get("ELEVENLABS_API_KEY")!,
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
    const audioStream = await client.generate({
      voice: "Rachel",
      model_id: "eleven_turbo_v2",
      text,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of audioStream) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return new Response(stream, {
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
