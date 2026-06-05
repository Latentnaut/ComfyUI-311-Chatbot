# ComfyUI-311-Chatbot

A standalone, premium LLM Chat widget node for ComfyUI using Google Gemini 3.5 & 3.1. 

## Key Features

- **Standalone Zero-Bloat**: Only contains the LLM Chat widget code. Completely independent.
- **Multimodal (Vision)**: Fully supports attaching images in the chat. Ask Gemini to describe, analyze, or explain anything inside your ComfyUI images.
- **Real-time SSE Streaming**: High performance streaming responses directly to the web interface.
- **Configurable Models**: Supports `gemini-3.5-flash` (default) and other compatible Gemini models.
- **Conflict-free Coexistence**: Registers under a separate route prefix (`/chatbot-311/`) and class name (`Chatbot311`), so it won't conflict with other custom nodes.

## Installation

1. Clone or copy this repository into your ComfyUI `custom_nodes` directory:
   ```bash
   cd ComfyUI/custom_nodes/
   git clone <your-repository-url> ComfyUI-311-Chatbot
   ```
2. Create or configure the local `.env` file inside the node directory:
   ```bash
   cd ComfyUI-311-Chatbot/
   cp .env.example .env  # Or create a new .env file
   ```
3. Restart ComfyUI.

## Configuration (.env)

Open the `.env` file in the node directory and set your API key and preferred model:

```env
# Google Gemini API key
GEMINI_API_KEY=your_gemini_api_key_here

# Model to use (defaults to gemini-3.5-flash)
GEMINI_MODEL=gemini-3.5-flash
```

## How to Use

1. Start ComfyUI and open the web interface.
2. Double-click on the canvas and search for **LLM Chat 311** or **LLM Chat (Chatbot-311)**.
3. Place the node. The chat widget will show a green status dot when it's online.
4. Type your message and hit Send! You can click the attachment clip to upload images to the chat context.
