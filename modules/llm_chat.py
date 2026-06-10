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
NODE_INPUT_CACHE = {}

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

# Register HTTP GET route to check paused status
@PromptServer.instance.routes.get("/chatbot-311/chat/paused-status/{node_id}")
async def paused_status(request):
    try:
        node_id = request.match_info.get("node_id", "")
        is_paused = node_id in CHAT_SESSIONS
        return web.json_response({"paused": is_paused})
    except Exception as e:
        return web.json_response({"paused": False, "error": str(e)}, status=500)

LOG = logging.getLogger(__name__)

def tensor_to_base64(tensor: torch.Tensor) -> str:
    """
    Convert a ComfyUI PyTorch IMAGE tensor to a base64 JPEG data URL.
    Optimized for vision models by resizing and compressing to JPEG.
    """
    try:
        # Handle batch dimension
        if len(tensor.shape) == 4:
            tensor = tensor[0]
            
        # Ensure it is a 3D tensor [H, W, C]
        if len(tensor.shape) == 3:
            # If shape is [C, H, W], permute to [H, W, C]
            if tensor.shape[0] in (1, 3, 4) and tensor.shape[2] > 4:
                tensor = tensor.permute(1, 2, 0)
        
        # Convert to numpy array
        array = (tensor.detach().cpu().numpy() * 255).astype("uint8")
        
        image = Image.fromarray(array)
        
        # Convert to RGB mode if not already (JPEG does not support RGBA)
        if image.mode != "RGB":
            image = image.convert("RGB")
            
        # Resize if image is too large (max 1024px in any dimension)
        max_size = 1024
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            
        buffered = io.BytesIO()
        # Save as JPEG with 80% quality to reduce base64 size significantly
        image.save(buffered, format="JPEG", quality=80)
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{img_str}"
    except Exception as e:
        LOG.error("Failed to convert image tensor to base64: %s", e)
        return ""

def query_gemini_sync(history: list, model: str = None, api_key: str = None) -> str:
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
        cfg, body, proxypath=proxypath, user_api_key=api_key
    )
    
    # Ensure Content-Type is set to application/json so that Google's API Gateway
    # does not interpret the raw JSON body as form-encoded query parameters.
    headers = dict(headers)
    headers["Content-Type"] = "application/json"
    
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
    if not text or not start:
        return ""
    
    # Try parsing as JSON first
    trimmed = text.strip()
    if trimmed.startswith("```"):
        lines = trimmed.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        trimmed = "\n".join(lines).strip()
        
    is_json = False
    json_data = None
    temp_text = trimmed
    if not temp_text.startswith("{"):
        try:
            import re
            tag_match = re.match(r"^<[^>]+>\s*(\{[\s\S]*\})\s*</[^>]+>$", temp_text)
            if tag_match:
                temp_text = tag_match.group(1).strip()
        except Exception:
            pass
            
    if temp_text.startswith("{") and temp_text.endswith("}"):
        try:
            json_data = json.loads(temp_text)
            is_json = True
        except Exception:
            pass

    # 1. Standard regex delimiter search (checks entire text including inside JSON string values)
    if end:
        try:
            import re
            pattern = re.escape(start) + r"(.*?)" + re.escape(end)
            match = re.search(pattern, text, re.DOTALL)
            if match:
                return match.group(1).strip()
        except Exception as e:
            LOG.error(f"Error extracting delimited content: {e}")

    # 2. Universal JSON fallback: if response is JSON but delimiters weren't matched
    if is_json and json_data:
        try:
            clean_start = start.strip().strip('"').strip("'").strip("<").strip(">")
            
            # Recursive key search
            def find_key(obj, target):
                if isinstance(obj, dict):
                    if target in obj:
                        val = obj[target]
                        return json.dumps(val, indent=2, ensure_ascii=False) if isinstance(val, (dict, list)) else str(val)
                    for k, v in obj.items():
                        res = find_key(v, target)
                        if res:
                            return res
                elif isinstance(obj, list):
                    for item in obj:
                        res = find_key(item, target)
                        if res:
                            return res
                return ""
            
            # Try finding the clean key (e.g. user set it to "reconstruction_prompt" or similar)
            val = find_key(json_data, clean_start)
            if val:
                return val
                
            # Try finding common prompt keys (case-insensitive)
            common_keys = ["prompt", "reconstruction_prompt", "final_prompt", "positive_prompt", "inpainting_prompt", "text", "output"]
            for target_k in common_keys:
                def find_key_ci(obj, target):
                    if isinstance(obj, dict):
                        for k, v in obj.items():
                            if k.lower() == target:
                                return json.dumps(v, indent=2, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)
                        for k, v in obj.items():
                            res = find_key_ci(v, target)
                            if res:
                                return res
                    elif isinstance(obj, list):
                        for item in obj:
                            res = find_key_ci(item, target)
                            if res:
                                return res
                    return ""
                val = find_key_ci(json_data, target_k)
                if val:
                    return val
            
            # Find the longest string value (the main prompt/output)
            longest_str = ""
            def find_longest_str(obj):
                nonlocal longest_str
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        find_longest_str(v)
                elif isinstance(obj, list):
                    for item in obj:
                        find_longest_str(item)
                elif isinstance(obj, str):
                    if len(obj) > len(longest_str):
                        longest_str = obj
            find_longest_str(json_data)
            if longest_str:
                return longest_str
        except Exception:
            pass

    return ""

def ensure_latest_user_message_has_image(api_messages: list):
    """
    Ensure the latest user message has the image if present in earlier messages,
    because Gemini's OpenAI-compatible API ignores images in past history.
    """
    if api_messages and api_messages[-1].get("role") == "user":
        last_msg = api_messages[-1]
        has_image = False
        if isinstance(last_msg.get("content"), list):
            has_image = any(part.get("type") == "image_url" for part in last_msg["content"])
        
        if not has_image:
            found_images = []
            for msg in reversed(api_messages[:-1]):
                if msg.get("role") == "user" and isinstance(msg.get("content"), list):
                    imgs = [part for part in msg["content"] if part.get("type") == "image_url"]
                    if imgs:
                        found_images = imgs
                        break
            if found_images:
                if isinstance(last_msg.get("content"), str):
                    last_msg["content"] = [{"type": "text", "text": last_msg["content"]}]
                last_msg["content"] = list(last_msg["content"]) + found_images

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
                "api_key": ("STRING", {
                    "default": "",
                    "placeholder": "API Key or proxy URL (Optional, defaults to env)",
                    "multiline": False
                }),
                "seed": ("INT", {
                    "default": 0,
                    "min": 0,
                    "max": 0xffffffffffffffff
                }),
            },
            "optional": {
                "image": ("IMAGE",),
                "prompt": ("STRING", {"forceInput": True, "multiline": True}),
                "system_general": ("STRING", {"forceInput": True, "multiline": True}),
                "system_variable": ("STRING", {"forceInput": True, "multiline": True}),
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
        
        api_key = kwargs.get("api_key", "")
        if isinstance(api_key, list):
            api_key = api_key[0] if api_key else ""
        api_key = api_key.strip()
        
        image = kwargs.get("image")
        
        # Helper to unpack and clean string inputs from list wrappers
        def unpack_str(val):
            if isinstance(val, list):
                val = val[0] if val else ""
            if val is None:
                return ""
            return str(val)

        prompt_str = unpack_str(kwargs.get("prompt", ""))
        system_general_str = unpack_str(kwargs.get("system_general", ""))
        system_variable_str = unpack_str(kwargs.get("system_variable", ""))
        system_legacy_str = unpack_str(kwargs.get("system", ""))
        
        # 1. Determine the base/general system prompt
        gen_prompt = system_general_str
        if not gen_prompt or not gen_prompt.strip():
            # Fallback to legacy system input if present, otherwise to file
            if system_legacy_str and system_legacy_str.strip():
                gen_prompt = system_legacy_str
            else:
                try:
                    from pathlib import Path
                    sys_prompt_file = Path(__file__).resolve().parent.parent / "system_prompt.md"
                    if sys_prompt_file.exists():
                        gen_prompt = sys_prompt_file.read_text(encoding="utf-8")
                except Exception as e:
                    LOG.error("Failed to load default system prompt from file: %s", e)

        # 2. Combine general and variable system prompts
        system_parts = []
        if gen_prompt and gen_prompt.strip():
            system_parts.append(gen_prompt.strip())
        if system_variable_str and system_variable_str.strip():
            system_parts.append(system_variable_str.strip())
            
        # Append active output delimiters instructions
        num_delimiters = kwargs.get("number_of_delimiters", 1)
        if isinstance(num_delimiters, list):
            num_delimiters = num_delimiters[0]
        count = int(num_delimiters)
        
        delimiters_instructions = []
        for i in range(1, 21):
            if i <= count:
                start = kwargs.get(f"starting_delimiter_{i}", f"<prompt_{i}>")
                end = kwargs.get(f"ending_delimiter_{i}", f"</prompt_{i}>")
                delimiters_instructions.append(f"- Delimiter {i}: Wrap the final output between '{start}' and '{end}'")
        
        if delimiters_instructions:
            start_ex = kwargs.get('starting_delimiter_1', '<prompt_1>')
            end_ex = kwargs.get('ending_delimiter_1', '</prompt_1>')
            delim_text = (
                "### IMPORTANT: ACTIVE OUTPUT DELIMITERS\n"
                "If the user asks you to write, generate, or output a specific prompt, text, code, or JSON that they want to extract, you MUST wrap the entire final output using these exact delimiters (without markdown code blocks around the delimiters themselves):\n"
                + "\n".join(delimiters_instructions)
                + f"\n\n- If your response is formatted as a JSON object, wrap the ENTIRE JSON object itself inside the delimiters. Example:\n{start_ex}\n{{\n  \"key\": \"value\"\n}}\n{end_ex}\n"
                + f"- If your response is standard text/markdown, wrap the final prompt block inside the delimiters. Example:\n{start_ex}\nyour prompt here\n{end_ex}"
            )
            system_parts.append(delim_text)
            
        system = "\n\n".join(system_parts)

        # Retrieve cache for this node to survive class re-instantiation
        node_cache = NODE_INPUT_CACHE.setdefault(node_id, {
            "last_image": None, 
            "last_prompt": None, 
            "last_seed": None, 
            "last_system_general": None,
            "last_system_variable": None,
            "initialized": False
        })
        cache_initialized = node_cache.get("initialized", False)
        last_image = node_cache.get("last_image")
        last_prompt = node_cache.get("last_prompt")
        last_seed = node_cache.get("last_seed")
        last_sys_gen = node_cache.get("last_system_general")
        last_sys_var = node_cache.get("last_system_variable")

        # Determine if inputs have changed
        prompt_changed = (last_prompt != prompt_str)
        sys_gen_changed = (last_sys_gen != system_general_str)
        sys_var_changed = (last_sys_var != system_variable_str)

        image_changed = True
        if last_image is not None and image is not None:
            if last_image.shape == image.shape:
                if torch.equal(last_image, image):
                    image_changed = False
        elif last_image is None and image is None:
            image_changed = False

        seed = kwargs.get("seed", 0)
        if isinstance(seed, list):
            seed = seed[0]
        seed_changed = (last_seed != seed)

        # We treat it as new input if history is empty, or if inputs actually changed.
        is_really_new = False
        if len(history) == 0:
            is_really_new = True
        elif not cache_initialized:
            # Process restart: cache is empty but history exists.
            # Warm the cache with current inputs and skip re-querying.
            LOG.info("[Chatbot311] Cache cold after restart, warming cache (history has %d msgs). Skipping re-query.", len(history))
            node_cache["last_image"] = image
            node_cache["last_prompt"] = prompt_str
            node_cache["last_seed"] = seed
            node_cache["last_system_general"] = system_general_str
            node_cache["last_system_variable"] = system_variable_str
            node_cache["initialized"] = True
            is_really_new = False
        elif (prompt_str.strip() and prompt_changed) or (image is not None and image_changed) or seed_changed or sys_gen_changed or sys_var_changed:
            is_really_new = True

        # Determine if we received execution inputs (prompt or image) from the workflow graph or a UI draft
        draft = ui_widget.get("draft", "").strip()
        has_draft = bool(draft)
        
        has_new_input = False
        user_parts = []
        
        if has_draft:
            user_parts.append({"type": "text", "text": draft})
            has_new_input = True
            is_really_new = True
            
            if image is not None:
                if len(image.shape) == 4:
                    for img_slice in image:
                        base64_image = tensor_to_base64(img_slice)
                        if base64_image:
                            user_parts.append({
                                "type": "image_url",
                                "image_url": {"url": base64_image}
                            })
                else:
                    base64_image = tensor_to_base64(image)
                    if base64_image:
                        user_parts.append({
                            "type": "image_url",
                            "image_url": {"url": base64_image}
                        })
        else:
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
                    
        if has_new_input and is_really_new:
            if image is not None and not prompt and not has_draft:
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
                    ensure_latest_user_message_has_image(api_messages)
                    
                    LOG.info(f"Querying Gemini ({model}) with system instruction...")
                    if node_id:
                        try:
                            PromptServer.instance.send_sync("chatbot311-show-typing", {
                                "node_id": node_id,
                                "show": True
                            })
                        except Exception:
                            pass
                    try:
                        assistant_response = query_gemini_sync(api_messages, model, api_key=api_key)
                        history.append({"role": "assistant", "content": assistant_response})
                    finally:
                        if node_id:
                            try:
                                PromptServer.instance.send_sync("chatbot311-show-typing", {
                                    "node_id": node_id,
                                    "show": False
                                })
                            except Exception:
                                pass
                except Exception as e:
                    history.append({"role": "assistant", "content": f"Execution Error: {str(e)}"})
                
                # Send websocket update back to frontend chat panel so it syncs instantly without reload
                if node_id:
                    try:
                        PromptServer.instance.send_sync("chatbot311-update-history", {
                            "node_id": node_id,
                            "history": history,
                            "clear_draft": has_draft
                        })
                    except Exception as e:
                        LOG.error("Failed to emit websocket update: %s", e)
            
            # Update cache of last processed inputs in global cache
            node_cache = NODE_INPUT_CACHE.setdefault(node_id, {
                "last_image": None, 
                "last_prompt": None, 
                "last_seed": None, 
                "last_system_general": None,
                "last_system_variable": None,
                "initialized": False
            })
            node_cache["last_image"] = image
            node_cache["last_prompt"] = prompt_str
            node_cache["last_seed"] = seed
            node_cache["last_system_general"] = system_general_str
            node_cache["last_system_variable"] = system_variable_str
            node_cache["initialized"] = True

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
                    ensure_latest_user_message_has_image(api_messages)
                    
                    LOG.info(f"Querying Gemini ({model}) with system instruction in One-Shot Prompt mode (from widget)...")
                    if node_id:
                        try:
                            PromptServer.instance.send_sync("chatbot311-show-typing", {
                                "node_id": node_id,
                                "show": True
                            })
                        except Exception:
                            pass
                    try:
                        assistant_response = query_gemini_sync(api_messages, model, api_key=api_key)
                        history.append({"role": "assistant", "content": assistant_response})
                    finally:
                        if node_id:
                            try:
                                PromptServer.instance.send_sync("chatbot311-show-typing", {
                                    "node_id": node_id,
                                    "show": False
                                })
                            except Exception:
                                pass
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
        if "draft" in ui_widget:
            ui_widget["draft"] = ""
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
