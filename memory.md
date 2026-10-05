# ComfyUI-311-Chatbot — Project Memory

## Gemini models (2026-10)
- Default model: `gemini-3.8-flash` (`modules/llm_chat.py`, `.env.example`).
- `gemini-3.1-flash-lite-preview` was shut down on 2026-05-25 → mapped to `gemini-3.5-flash-lite`.
- `gemini-3.5-pro` does not exist in the Gemini API → mapped to `gemini-3.1-pro-preview`.
- ComfyUI Credits proxy fallback chain: 3.6/3.7/3.8-flash → `gemini-3.5-flash` → `gemini-3.5-flash-lite`. Newer Flash models may not be enabled on the proxy yet.

## Chat UI (`web/deploy/css/chatbot.css`)
- Messages container uses `overflow-anchor: none` + `overscroll-behavior: contain` (no `scroll-behavior: smooth`) to avoid scroll jumps while streaming.
- Panel uses `isolation: isolate` so `backdrop-filter` stacking does not bleed into the ComfyUI canvas.

## Repo hygiene
- `.cds/` is a junction to the shared `docs/CDS` hub (created by `link_to_nodes.ps1`) → gitignored, never commit.
