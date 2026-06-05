# ✨ ComfyUI-311-Chatbot

A premium, standalone, zero-bloat LLM Chatbot widget node designed specifically for the ComfyUI workspace. Powered by **Google Gemini 3.5 & 3.1**, this custom node provides a beautiful, glassmorphic conversational interface directly on the node canvas, supporting real-time streaming, multimodal image attachments, and structured prompt extraction.

---

## 🎨 Premium Frontend Design & UX
The node embeds a modern, flat-design widget featuring:
- **Glassmorphic Theme**: Sophisticated dark background with blur filters (`backdrop-filter`) and glowing online/offline status signals.
- **Responsive Conversations Panel**: A collapsible sidebar to track, load, and delete multiple conversation histories.
- **Multimodal Preview Bar**: Real-time tray showcasing attached images—supporting both manual file uploads and live image outputs connected from other nodes in your ComfyUI graph.
- **SSE Real-time Streaming**: Instant streaming of LLM responses directly to the canvas widget.

---

## 🚀 Key Features

### 👁️ Multimodal Vision Support
Attach images to the chat window to ask Gemini questions, analyze structures, or request prompt modifications. Connect an `IMAGE` output from any node (like `LoadImage` or preview nodes), and the chatbot automatically ingests it into the conversational context.

### ⏱️ Interactive Execution Loop (Pause & Resume)
Run your workflow in **Interactive Chat (Pause)** mode. The workflow execution will pause when reaching the Chatbot node, alert you with a clean audio cue (C5 beep), and wait for you to review and confirm the LLM response on-screen before proceeding to downstream image generation.

### 🏷️ Delimiter-Based Output Extraction (Up to 20 Slots)
Perfect for feeding Stable Diffusion or FLUX text encoders. The node can parse the LLM's response and extract multiple substrings isolated by custom tags (e.g., `<prompt_1>...</prompt_1>` to `<prompt_20>...</prompt_20>`). Use these outputs to dynamically drive different prompts in your workflow.

---

## 📂 Node Input / Output Schema

### Inputs
- **`mode`**: Choose between:
  - `Interactive Chat (Pause)`: Wait for user confirmation, allowing real-time chat updates before completing execution.
  - `One-Shot Prompt`: Ingest inputs, query the LLM, and pass outputs immediately.
  - `Pass Last Output (Bypass)`: Bypass LLM query and pass the last recorded output.
- **`sound_alert`**: Toggle a desktop sound alert when ComfyUI execution pauses at the node.
- **`image`** *(Optional)*: Connect image tensors from other nodes.
- **`prompt`** *(Optional)*: Force input prompts dynamically from text nodes.
- **`system`** *(Optional)*: Connect a custom system instruction block. If empty, falls back to the local [system_prompt.md](file:///c:/AI/ComfyUI_windows_portable/ComfyUI/custom_nodes/ComfyUI-311-Chatbot/system_prompt.md).

### Outputs
- **`chat_history_json`**: Full conversation log in standard JSON format.
- **`last_message`**: The latest message in the thread.
- **`last_user_message`**: The last input provided by the user.
- **`last_llm_message`**: The last text response from Gemini.
- **`all_messages`**: Combined plaintext of the entire conversation.
- **`Delimiter_1` to `Delimiter_20`**: Substrings extracted between your custom starting and ending delimiters.

---

## 🛠️ Installation

1. Navigate to your ComfyUI `custom_nodes` directory:
   ```bash
   cd ComfyUI/custom_nodes/
   ```
2. Clone this repository under its clean, registered folder name:
   ```bash
   git clone https://github.com/Latentnaut/ComfyUI-311-Chatbot.git ComfyUI-311-Chatbot
   ```
3. Initialize the environment configuration inside `ComfyUI-311-Chatbot`:
   ```bash
   cd ComfyUI-311-Chatbot/
   cp .env.example .env
   ```
4. Restart your ComfyUI server.

---

## ⚙️ Configuration (.env)

Open the `.env` file in the node directory and set your API key and preferred model:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Model selection (defaults to gemini-3.5-flash)
GEMINI_MODEL=gemini-3.5-flash
```

---

## 💡 How to Use

1. Start ComfyUI and double-click the canvas.
2. Search for **Chatbot 311** and place the node.
3. If the backend is running, the status dot in the header will glow **green**.
4. Type your instruction, upload any images, or feed text/image inputs from the graph.
5. In **Interactive Chat (Pause)** mode, hit queue. The workflow will pause at the node, beep, and let you review the response. Click **Confirm** in the widget to push the generated prompt to the rest of the generation nodes!
