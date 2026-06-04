import os
import io
import base64
import json
import logging
import urllib.request
import urllib.error
from PIL import Image
import torch
import asyncio
from threading import Event
from aiohttp import web

from server import PromptServer
from .chatbot_utils import CATEGORY, FUNCTION, Input, normalize_json_input
from . import proxy_service as proxy_svc

CHAT_SESSIONS = {}

# Register HTTP POST route to resume chat
@PromptServer.instance.routes.post("/chatbot-311/chat/resume")
async def resume_chat(request):
    try:
        data = await request.json()
        node_id = str(data.get("node_id", ""))
        action = data.get("action")  # "confirm" or "cancel"
        history = data.get("history", [])
        
        if node_id in CHAT_SESSIONS:
            session = CHAT_SESSIONS[node_id]
            session["history"] = history
            session["action"] = action
            session["event"].set()
            return web.json_response({"success": True})
        else:
            return web.json_response({"success": False, "error": f"Session {node_id} not found or already resumed"})
    except Exception as e:
        return web.json_response({"success": False, "error": str(e)}, status=500)

LOG = logging.getLogger(__name__)

def tensor_to_base64(tensor: torch.Tensor) -> str:
    """
    Convert a ComfyUI PyTorch IMAGE tensor [B, H, W, C] to a base64 PNG data URL.
    """
    try:
        if len(tensor.shape) == 4:
            tensor = tensor[0]
            
        array = (tensor.cpu().numpy() * 255).astype("uint8")
        image = Image.fromarray(array)
        
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        LOG.error("Failed to convert image tensor to base64: %s", e)
        return ""

def query_gemini_sync(history: list, model: str = None) -> str:
    """
    Send standard chat history list to Gemini's OpenAI-compatible completions endpoint.
    Uses urllib synchronously to avoid event loop conflicts.
    """
    cfg = proxy_svc.SERVICES.get("gemini", {})
    proxypath = "v1/chat/completions"
    
    body = {
        "model": model or cfg.get("default_model", "gemini-3.5-flash"),
        "messages": history,
        "stream": False
    }
    
    upstream, headers, timeout, forward_body = proxy_svc._build_upstream_and_headers(
        cfg, body, proxypath=proxypath
    )
    
    req = urllib.request.Request(
        upstream,
        data=json.dumps(forward_body).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            resp_data = response.read().decode("utf-8")
            result = json.loads(resp_data)
            return result["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        err_text = e.read().decode("utf-8")
        LOG.error("Gemini API HTTP Error %s: %s", e.code, err_text)
        raise Exception(f"Gemini API returned error {e.code}: {err_text}")
    except Exception as e:
        LOG.error("Failed to query Gemini API: %s", e)
        raise Exception(f"Failed to query Gemini API: {str(e)}")

def extract_delimited_content(text: str, start: str, end: str) -> str:
    if not text or not start or not end:
        return ""
    try:
        import re
        pattern = re.escape(start) + r"(.*?)" + re.escape(end)
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
    except Exception as e:
        LOG.error(f"Error extracting delimited content: {e}")
    return ""

# region Chatbot311
class Chatbot311:
    @classmethod
    def INPUT_TYPES(cls):
        inputs = {
            "required": {
                "mode": (["Interactive Chat (Pause)", "One-Shot Prompt", "Pass Last Output (Bypass)"], {
                    "default": "Interactive Chat (Pause)"
                }),
                "sound_alert": ("BOOLEAN", {
                    "default": True,
                    "label_on": "On",
                    "label_off": "Off"
                }),
                "number_of_delimiters": ("INT", {
                    "default": 1,
                    "min": 1,
                    "max": 20,
                    "step": 1
                }),
            },
            "optional": {
                "image": ("IMAGE",),
                "prompt": ("STRING", {"forceInput": True, "multiline": True}),
                "system": ("STRING", {"forceInput": True, "multiline": True}),
            },
            "hidden": {
                "node_id": "UNIQUE_ID"
            }
        }
        for i in range(1, 21):
            inputs["required"][f"starting_delimiter_{i}"] = ("STRING", {"default": f"<prompt_{i}>"})
            inputs["required"][f"ending_delimiter_{i}"] = ("STRING", {"default": f"</prompt_{i}>"})
        inputs["required"]["ui_widget"] = (Input.CHAT_311, {"default": {}})
        return inputs

    CATEGORY = CATEGORY
    FUNCTION = FUNCTION
    OUTPUT_IS_LIST = (False, False, False, False, True) + (False,) * 20
    OUTPUT_TOOLTIPS = (
        "Chat history as JSON.",
        "Last message in the chat.",
        "Last message from the user.",
        "Last message from the LLM.",
        "All messages in the chat.",
    ) + tuple(f"Extracted content for Delimiter {i}." for i in range(1, 21))
    RETURN_NAMES = ("chat_history_json", "last_message", "last_user_message", "last_llm_message", "all_messages") + tuple(f"Delimiter_{i}" for i in range(1, 21))
    RETURN_TYPES = (Input.JSON, Input.STRING, Input.STRING, Input.STRING, Input.STRING) + (Input.STRING,) * 20

    def on_exec(self, **kwargs: dict):
        ui_widget: dict = normalize_json_input(kwargs.get("ui_widget", {}))
        history: list = normalize_json_input(ui_widget.get("history", []))
        
        mode = kwargs.get("mode", "Interactive Chat (Pause)")
        actual_mode = mode[0] if isinstance(mode, list) else mode
        
        sound_alert = kwargs.get("sound_alert", True)
        if isinstance(sound_alert, list):
            sound_alert = sound_alert[0]
            
        node_id = kwargs.get("node_id")
        node_id = str(node_id) if node_id is not None else ""
        
        image = kwargs.get("image")
        prompt = kwargs.get("prompt", "")
        system = kwargs.get("system", "")
        if not system or not system.strip():
            try:
                from pathlib import Path
                sys_prompt_file = Path(__file__).resolve().parent.parent / "system_prompt.md"
                if sys_prompt_file.exists():
                    system = sys_prompt_file.read_text(encoding="utf-8")
            except Exception as e:
                LOG.error("Failed to load default system prompt from file: %s", e)
        
        # Determine if we received execution inputs (prompt or image) from the workflow graph
        has_new_input = False
        user_parts = []
        
        if prompt and prompt.strip():
            user_parts.append({"type": "text", "text": prompt.strip()})
            has_new_input = True
            
        if image is not None:
            if len(image.shape) == 4:
                for img_slice in image:
                    base64_image = tensor_to_base64(img_slice)
                    if base64_image:
                        user_parts.append({
                            "type": "image_url",
                            "image_url": {"url": base64_image}
                        })
                        has_new_input = True
            else:
                base64_image = tensor_to_base64(image)
                if base64_image:
                    user_parts.append({
                        "type": "image_url",
                        "image_url": {"url": base64_image}
                    })
                    has_new_input = True
                
        if has_new_input:
            if image is not None and not prompt:
                num_imgs = len(image) if len(image.shape) == 4 else 1
                desc_text = "Describe this image." if num_imgs <= 1 else "Describe these images."
                user_parts.insert(0, {"type": "text", "text": desc_text})
                
            user_message = {
                "role": "user",
                "content": user_parts if len(user_parts) > 1 else (user_parts[0]["text"] if user_parts[0]["type"] == "text" else user_parts)
            }
            history.append(user_message)
            
            # Query Gemini synchronously (only if NOT in Pass Last Output mode)
            if actual_mode in ("Interactive Chat (Pause)", "One-Shot Prompt"):
                try:
                    model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")
                    
                    # Prepend system prompt to temp list for API call
                    api_messages = []
                    if system and system.strip():
                        api_messages.append({"role": "system", "content": system.strip()})
                    
                    for msg in history:
                        api_messages.append({
                            "role": msg.get("role"),
                            "content": msg.get("content")
                        })
                    
                    LOG.info(f"Querying Gemini ({model}) with system instruction...")
                    assistant_response = query_gemini_sync(api_messages, model)
                    history.append({"role": "assistant", "content": assistant_response})
                except Exception as e:
                    history.append({"role": "assistant", "content": f"Execution Error: {str(e)}"})
                
                # Send websocket update back to frontend chat panel so it syncs instantly without reload
                if node_id:
                    try:
                        PromptServer.instance.send_sync("chatbot311-update-history", {
                            "node_id": node_id,
                            "history": history
                        })
                    except Exception as e:
                        LOG.error("Failed to emit websocket update: %s", e)

        # Handle Pause/Interactive mode if requested
        if actual_mode == "Interactive Chat (Pause)" and node_id:
            # We register the pause session
            event = Event()
            CHAT_SESSIONS[node_id] = {
                "event": event,
                "history": history,
                "action": None
            }
            
            # Send notification to UI that we are paused and waiting for confirmation
            try:
                PromptServer.instance.send_sync("chatbot311-chat-paused", {
                    "node_id": node_id,
                    "sound_alert": sound_alert
                })
            except Exception as e:
                LOG.error("Failed to emit pause websocket: %s", e)
                
            # Wait loop
            import comfy.model_management
            import time
            try:
                while node_id in CHAT_SESSIONS:
                    session = CHAT_SESSIONS[node_id]
                    if comfy.model_management.processing_interrupted():
                        CHAT_SESSIONS.pop(node_id, None)
                        raise comfy.model_management.InterruptProcessingException()
                    
                    if session.get("action") == "confirm":
                        history = session.get("history", history)
                        CHAT_SESSIONS.pop(node_id, None)
                        break
                    elif session.get("action") == "cancel":
                        CHAT_SESSIONS.pop(node_id, None)
                        raise comfy.model_management.InterruptProcessingException()
                    
                    time.sleep(0.1)
            except Exception as e:
                CHAT_SESSIONS.pop(node_id, None)
                if isinstance(e, comfy.model_management.InterruptProcessingException):
                    raise
                LOG.error(f"Error in interactive chat wait loop: {e}")

        # Handle One-Shot Prompt query if widget text was entered but no new graph input triggered
        elif actual_mode == "One-Shot Prompt" and not has_new_input:
            if history and history[-1].get("role") == "user":
                try:
                    model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")
                    
                    # Prepend system prompt to temp list for API call
                    api_messages = []
                    if system and system.strip():
                        api_messages.append({"role": "system", "content": system.strip()})
                    
                    for msg in history:
                        api_messages.append({
                            "role": msg.get("role"),
                            "content": msg.get("content")
                        })
                    
                    LOG.info(f"Querying Gemini ({model}) with system instruction in One-Shot Prompt mode (from widget)...")
                    assistant_response = query_gemini_sync(api_messages, model)
                    history.append({"role": "assistant", "content": assistant_response})
                    
                    # Send websocket update back to frontend chat panel so it syncs instantly without reload
                    if node_id:
                        PromptServer.instance.send_sync("chatbot311-update-history", {
                            "node_id": node_id,
                            "history": history
                        })
                except Exception as e:
                    history.append({"role": "assistant", "content": f"Execution Error: {str(e)}"})
                    if node_id:
                        try:
                            PromptServer.instance.send_sync("chatbot311-update-history", {
                                "node_id": node_id,
                                "history": history
                            })
                        except Exception:
                            pass

        # Parse outputs for node output slots
        all_messages = []
        for msg in history:
            content_val = msg.get("content")
            if isinstance(content_val, list):
                text_parts = [p.get("text", "") for p in content_val if p.get("type") == "text"]
                all_messages.append(" ".join(text_parts))
            else:
                all_messages.append(str(content_val))

        last_message = all_messages[-1] if all_messages else ""
        
        last_user_message = ""
        for msg in reversed(history):
            if msg.get("role") == "user":
                content_val = msg.get("content")
                if isinstance(content_val, list):
                    text_parts = [p.get("text", "") for p in content_val if p.get("type") == "text"]
                    last_user_message = " ".join(text_parts)
                else:
                    last_user_message = str(content_val)
                break

        last_llm_message = ""
        for msg in reversed(history):
            if msg.get("role") == "assistant":
                content_val = msg.get("content")
                if isinstance(content_val, list):
                    text_parts = [p.get("text", "") for p in content_val if p.get("type") == "text"]
                    last_llm_message = " ".join(text_parts)
                else:
                    last_llm_message = str(content_val)
                break

        # Extract delimited strings from the assistant response
        num_delimiters = kwargs.get("number_of_delimiters", 1)
        if isinstance(num_delimiters, list):
            num_delimiters = num_delimiters[0]
        count = int(num_delimiters)
        
        delim_outs = []
        for i in range(1, 21):
            delim_val = ""
            if i <= count:
                start = kwargs.get(f"starting_delimiter_{i}", f"<prompt_{i}>")
                end = kwargs.get(f"ending_delimiter_{i}", f"</prompt_{i}>")
                delim_val = extract_delimited_content(last_llm_message, start, end)
            delim_outs.append(delim_val)

        ui_widget["history"] = history
        return (ui_widget, last_message, last_user_message, last_llm_message, all_messages) + tuple(delim_outs)
# endregion

# region Mappings
NODE_CLASS_MAPPINGS = {
    "Chatbot311": Chatbot311,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Chatbot311": "Chatbot 311",
}
# endregion
