# CallCheck

Robot mystery shopper for a business phone line: places (or simulates) a customer call, then grades it on answer speed, greeting, info accuracy and booking attempt.

## Run

```bash
npm install
npm run build && PORT=3123 npm start   # or: npm run dev
```

Call history is stored in the browser (localStorage).

## Environment variables

Put these in `.env.local` (all optional):

| Variable | Needed for | Notes |
|---|---|---|
| `OPENAI_API_KEY` | LLM scoring | Without it, a deterministic rule-based scorer is used. |
| `OPENAI_MODEL` | LLM scoring | Optional. Default `gpt-4o-mini`. |
| `VAPI_API_KEY` | Live calls | Your **private** Vapi API key (Dashboard → API Keys). Server-side only. |
| `VAPI_PHONE_NUMBER_ID` | Live calls | ID of a phone number in your Vapi account (Dashboard → Phone Numbers) used as caller ID. |
| `VAPI_MODEL` | Live calls | Optional. OpenAI model the caller assistant uses inside Vapi. Default `gpt-4o-mini`. |
| `VAPI_VOICE_ID` | Live calls | Optional. Vapi built-in voice name; omit to use Vapi's default voice. |

**Mode selection:** when both `VAPI_API_KEY` and `VAPI_PHONE_NUMBER_ID` are set, "Run test call" places a real outbound call and the UI shows **Live call**. Otherwise the app runs in **Demo mode** with scripted, simulated calls.

## How live calls work

1. `POST /api/call` → `POST https://api.vapi.ai/call` with `phoneNumberId`, `customer.number` (normalized to E.164; 10-digit numbers get `+1`), and a transient `assistant`. The assistant uses `firstMessageMode: "assistant-waits-for-user"`, a system prompt that plays a customer following the chosen scenario, `artifactPlan.recordingEnabled: true` and `transcriptPlan.enabled: true`, and a 180-second cap.
2. The browser polls `GET /api/call?id=…` every 2 s. That calls `GET https://api.vapi.ai/call/{id}` and maps `artifact.messages` (`user` = business staff, `bot` = our caller) into the transcript and shows `status` (queued / ringing / in-progress / ended).
3. Time to answer = `startedAt − createdAt` plus the first staff message's `secondsFromStart`, converted to approximate rings (~6 s each). The transcript then goes to `/api/score` (the same LLM/rules scorer).

## Consent and compliance

The consent checkbox is required for both modes, and the server rejects a live call without it. Only test numbers you own or are authorized to manage, tell staff in advance that calls may be tested and recorded, and check the recording-consent rules where you operate.

## Industries, coaching and inbound tests (v3)
- `lib/industries.ts` defines every industry: fact fields, scenarios, caller prompt and Vapi assistant settings, scoring rubric (category labels plus what "good" means), and coaching lines. Car dealership is the default. Its caller persona comes from the configured dealership assistant (`lib/dealer-prompt.ts`).
- Demo scripts and the rules scorer are generated from the same config. The LLM scorer gets the industry rubric too.
- Scorecards include a Coaching section, and the dashboard shows a "Practice this week" panel with the top 3 tips.
- Env vars:
  - `OPENAI_MODEL` (e.g. `gpt-5.5`): GPT-5/o-series models are sent `max_completion_tokens` and no temperature.
  - `VAPI_ASSISTANT_ID` (optional): when set, starting a live test PATCHes that assistant to the selected industry and scenario. Waiting for staff to speak first is always on. The app then polls for the next call to that assistant and auto-saves the scored result.
  - `VAPI_INBOUND_NUMBER` (optional): displayed so the tester knows which number to call.
- Shell env vars override `.env.local`. If the shell already exports `OPENAI_API_KEY`, start with `env -u OPENAI_API_KEY -u OPENAI_MODEL PORT=3123 npm start`.
