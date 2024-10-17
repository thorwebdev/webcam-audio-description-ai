// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  prepareVirtualFile,
} from "https://deno.land/x/mock_file@v1.1.2/mod.ts";

import {
  FileMetadataResponse,
  GoogleAIFileManager,
} from "npm:@google/generative-ai/server";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Initialize GoogleAIFileManager with your API_KEY.
const fileManager = new GoogleAIFileManager(
  Deno.env.get("GEMINI_API_KEY") ?? "",
);

// Initialize GoogleGenerativeAI with your API_KEY.
const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") ?? "");

// Choose a Gemini model.
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
});

// Check file status
const checkFileStatus = async (file: FileMetadataResponse): Promise<void> => {
  if (file.state === "PROCESSING") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // TODO: open issue: Why does file not include id?
    const newFile = await fileManager.getFile(file.name);
    console.log("newFile", newFile);
    return checkFileStatus(newFile);
  }
  return;
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const formData = await req.formData();
  const data = formData.get("file") as Blob;
  // We need to mock the file because Edge Runtime doesn't have a filesystem.
  prepareVirtualFile(
    "./screen-capture.webm",
    new Uint8Array(await data.arrayBuffer()),
  );

  // Upload the file and specify a display name.
  const uploadResponse = await fileManager.uploadFile("./screen-capture.webm", {
    mimeType: "video/webm",
    displayName: "screen-recording",
  });

  console.log(uploadResponse);
  await checkFileStatus(uploadResponse.file);

  // Generate content using text and the URI reference for the uploaded file.
  const result = await model.generateContent([
    {
      fileData: {
        mimeType: uploadResponse.file.mimeType,
        fileUri: uploadResponse.file.uri,
      },
    },
    {
      text:
        "Provide visual descriptions in sequence of the video. Do not include any timestamps or positions as coordinates.",
    },
  ]);

  // Handle the response of generated text
  const description = result.response.text();
  console.log(JSON.stringify({ description }, null, 2));

  return new Response(
    JSON.stringify({ description }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/describe-video' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
