# Webcam Audio Description Generator

Generate audio descriptions for your videos using [Google Gemini]() and [ElevenLabs]().

## Setup

- `cp supabase/functions/.env. example supabase/functions/.env`
- Set your [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key) in `supabase/functions/.env`
- Set your [ElevenLabs API key](elevenlabs.io/?from=partnersmith6824) in `supabase/functions/.env`

## Run locally

```bash
supabase start
supabase functions serve --no-verify-jwt
# In another terminal
python3 -m http.server
```

Open http://localhost:8000/
