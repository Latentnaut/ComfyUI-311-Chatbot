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

# Module-level cache for ComfyUI Org auth token.
# Populated when a workflow execution provides a valid token via the hidden input.
# Used by sidebar proxy requests that can't obtain the token from the frontend.
_CACHED_COMFY_ORG_TOKEN = None

def _on_prompt_intercept_token(json_data):
    """Intercept auth tokens from prompt queue requests to cache for sidebar use."""
    global _CACHED_COMFY_ORG_TOKEN
    try:
        extra_data = json_data.get("extra_data", {})
        token = extra_data.get("auth_token_comfy_org") or extra_data.get("api_key_comfy_org")
        if token:
            _CACHED_COMFY_ORG_TOKEN = token
            LOG.debug("Cached ComfyUI Org auth token from prompt queue request.")
    except Exception:
        pass
    return json_data

PromptServer.instance.add_on_prompt_handler(_on_prompt_intercept_token)


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

def get_comfy_org_auth(hidden_token=None):
    """Attempts to get ComfyUI Org authentication token."""
    global _CACHED_COMFY_ORG_TOKEN
    try:
        from comfy_api_nodes.util._helpers import default_base_url
        comfy_api_base = default_base_url()
    except ImportError:
        comfy_api_base = "https://api.comfy.org"
        
    auth_header = {}
    auth_token = hidden_token
    if isinstance(auth_token, list):
        auth_token = auth_token[0] if auth_token else ""
    
    if auth_token and not isinstance(auth_token, str):
        auth_token = None

    if not auth_token:
        try:
            from comfy.cli_args import args
            auth_token = getattr(args, "api_key_comfy_org", None)
        except ImportError:
            pass

    # Fallback: use cached token from a previous workflow execution
    if not auth_token and _CACHED_COMFY_ORG_TOKEN and isinstance(_CACHED_COMFY_ORG_TOKEN, str):
        auth_token = _CACHED_COMFY_ORG_TOKEN
        LOG.debug("Using cached ComfyUI Org auth token from prior workflow execution.")

    # Cross-module fallback: check other nodes (like Gemini3 fallback node) for cached token
    if not auth_token:
        try:
            import sys
            for m_name, m in list(sys.modules.items()):
                if "torch" in m_name:
                    continue
                try:
                    if hasattr(m, "_CACHED_COMFY_ORG_TOKEN"):
                        token = getattr(m, "_CACHED_COMFY_ORG_TOKEN", None)
                        if token and isinstance(token, str):
                            auth_token = token
                            _CACHED_COMFY_ORG_TOKEN = token
                            LOG.debug(f"Found and cached ComfyUI Org auth token from module: {m_name}")
                            break
                except Exception:
                    pass
        except Exception:
            pass
            
    if not auth_token or not isinstance(auth_token, str):
        auth_token = os.environ.get("COMFY_API_TOKEN") or os.environ.get("COMFY_ORG_API_KEY")

    if auth_token:
        # Update cache with valid token
        _CACHED_COMFY_ORG_TOKEN = auth_token
        auth_header["Authorization"] = f"Bearer {auth_token}"
        auth_header["X-API-KEY"] = auth_token
        
    return comfy_api_base, auth_header, auth_token

def query_gemini_sync(history: list, model: str = None, api_key: str = None, use_comfyui_credits: bool = True, auth_token_comfy_org: str = "", info: dict = None) -> str:
    """
    Send standard chat history list to Gemini's OpenAI-compatible completions endpoint
    or to official ComfyUI API using ComfyUI Credits.
    Urllib or sync_op is used synchronously to avoid event loop conflicts.
    """
    if use_comfyui_credits:
        try:
            comfy_api_base, auth_headers, actual_token = get_comfy_org_auth(auth_token_comfy_org)
            if not actual_token:
                LOG.warning("ComfyUI Credits enabled but no token found. Falling back to custom keys...")
            else:
                LOG.info("🪙 Using ComfyUI Credits to query Gemini chatbot...")
                
                # Import necessary comfy_api_nodes modules dynamically to ensure they are available
                from comfy_api_nodes.util import sync_op, ApiEndpoint
                from comfy_api_nodes.apis.gemini import (
                    GeminiContent,
                    GeminiGenerateContentRequest,
                    GeminiGenerateContentResponse,
                    GeminiPart,
                    GeminiRole,
                    GeminiSystemInstructionContent,
                    GeminiTextPart,
                    GeminiInlineData,
                    GeminiMimeType,
                )
                
                import threading
                
                thread_res = []
                thread_err = []
                
                actual_model = model or "gemini-3.5-flash"
                # Map legacy or known different names, but let 3.5 models pass through to be tried first
                if actual_model in ("gemini-3-1-flash-lite", "gemini-3.1-flash-lite"):
                    actual_model = "gemini-3.1-flash-lite-preview"
                elif actual_model in ("gemini-3-1-pro", "gemini-3.1-pro", "gemini-3-pro-preview"):
                    actual_model = "gemini-3.1-pro-preview"
                elif actual_model in ("gemini-2.5-flash", "gemini-2.5-flash-preview"):
                    actual_model = "gemini-2.5-flash"
                elif actual_model in ("gemini-2.5-pro", "gemini-2.5-pro-preview"):
                    actual_model = "gemini-2.5-pro"

                actual_model_used = [actual_model]
                
                def _run_async_credits():
                     import asyncio
                     import platform
                     import logging
                     
                     logging.getLogger("asyncio").setLevel(logging.CRITICAL)
                     
                     if platform.system() == 'Windows':
                         try:
                             from asyncio import WindowsProactorEventLoopPolicy
                             asyncio.set_event_loop_policy(WindowsProactorEventLoopPolicy())
                         except ImportError:
                             pass
                             
                     new_loop = asyncio.new_event_loop()
                     asyncio.set_event_loop(new_loop)
                     
                     if hasattr(new_loop, 'set_exception_handler'):
                         def silence_connection_reset(loop, context):
                             if "exception" in context:
                                 exc = context["exception"]
                                 if isinstance(exc, (ConnectionResetError, ConnectionAbortedError)):
                                     return
                             loop.default_exception_handler(context)
                         new_loop.set_exception_handler(silence_connection_reset)
                         
                     try:
                         # Prepare the GeminiGenerateContentRequest data
                         system_instr = None
                         filtered_contents = []
                         
                         for msg in history:
                             role_str = msg.get("role")
                             content_val = msg.get("content")
                             
                             if role_str == "system":
                                 system_text = content_val
                                 if isinstance(system_text, list):
                                     system_text = " ".join(part.get("text", "") for part in system_text if part.get("type") == "text")
                                 system_instr = GeminiSystemInstructionContent(parts=[GeminiTextPart(text=str(system_text).strip())], role=None)
                                 continue
                                 
                             role_val = GeminiRole.user if role_str == "user" else GeminiRole.model
                             parts = []
                             
                             if isinstance(content_val, list):
                                 for part in content_val:
                                     if part.get("type") == "text":
                                         parts.append(GeminiPart(text=part.get("text")))
                                     elif part.get("type") == "image_url":
                                         url = part.get("image_url", {}).get("url", "")
                                         if "," in url:
                                             header, data_b64 = url.split(",", 1)
                                             mime_type = GeminiMimeType.image_jpeg
                                             if "png" in header:
                                                 mime_type = GeminiMimeType.image_png
                                             elif "webp" in header:
                                                 mime_type = GeminiMimeType.image_webp
                                             parts.append(GeminiPart(inlineData=GeminiInlineData(data=data_b64, mimeType=mime_type)))
                             else:
                                 parts.append(GeminiPart(text=str(content_val)))
                                 
                             filtered_contents.append(GeminiContent(role=role_val, parts=parts))
                             
                         class DummyNode:
                             class DummyHidden:
                                 pass
                             hidden = DummyHidden()
                         
                         DummyNode.hidden.auth_token_comfy_org = actual_token
                         DummyNode.hidden.api_key_comfy_org = actual_token
                         DummyNode.hidden.unique_id = "Chatbot311_Generated_Node"
                         
                         # Dynamically mock GeminiNode and GeminiImage2 hidden attributes if they exist
                         try:
                             from comfy_api_nodes.nodes_gemini import GeminiNode, GeminiImage2
                             if not hasattr(GeminiNode, "hidden") or GeminiNode.hidden is None:
                                 class DummyHiddenNode: pass
                                 GeminiNode.hidden = DummyHiddenNode()
                             GeminiNode.hidden.auth_token_comfy_org = actual_token
                             GeminiNode.hidden.api_key_comfy_org = actual_token
                             
                             if not hasattr(GeminiImage2, "hidden") or GeminiImage2.hidden is None:
                                 class DummyHiddenImg: pass
                                 GeminiImage2.hidden = DummyHiddenImg()
                             GeminiImage2.hidden.auth_token_comfy_org = actual_token
                             GeminiImage2.hidden.api_key_comfy_org = actual_token
                         except Exception:
                             pass
                         
                         result = None
                         try:
                             result = new_loop.run_until_complete(
                                 asyncio.wait_for(
                                     sync_op(
                                         DummyNode,
                                         endpoint=ApiEndpoint(path=f"/proxy/vertexai/gemini/{actual_model_used[0]}", method="POST"),
                                         data=GeminiGenerateContentRequest(
                                             contents=filtered_contents,
                                             systemInstruction=system_instr,
                                         ),
                                         response_model=GeminiGenerateContentResponse,
                                     ),
                                     timeout=120.0
                                 )
                             )
                         except Exception as first_exc:
                             # Determine fallback model
                             fallback_model = None
                             if actual_model_used[0] == "gemini-3.5-flash":
                                 fallback_model = "gemini-3.1-flash-lite-preview"
                             elif actual_model_used[0] == "gemini-3.5-pro":
                                 fallback_model = "gemini-3.1-pro-preview"
                             elif actual_model_used[0] not in ("gemini-3.1-flash-lite-preview", "gemini-3.1-pro-preview", "gemini-2.5-flash", "gemini-2.5-pro"):
                                 if "pro" in actual_model_used[0].lower():
                                     fallback_model = "gemini-3.1-pro-preview"
                                 else:
                                     fallback_model = "gemini-3.1-flash-lite-preview"
                             
                             if fallback_model:
                                 LOG.warning("ComfyUI Credits call with %s failed: %s. Retrying with fallback model %s...", actual_model_used[0], first_exc, fallback_model)
                                 actual_model_used[0] = fallback_model
                                 result = new_loop.run_until_complete(
                                     asyncio.wait_for(
                                         sync_op(
                                             DummyNode,
                                             endpoint=ApiEndpoint(path=f"/proxy/vertexai/gemini/{fallback_model}", method="POST"),
                                             data=GeminiGenerateContentRequest(
                                                 contents=filtered_contents,
                                                 systemInstruction=system_instr,
                                             ),
                                             response_model=GeminiGenerateContentResponse,
                                         ),
                                         timeout=120.0
                                     )
                                 )
                             else:
                                 raise first_exc
                         
                         if result and result.candidates:
                             parts = []
                             for candidate in result.candidates:
                                 if candidate.content and candidate.content.parts:
                                     for part in candidate.content.parts:
                                         if part.text:
                                             parts.append(part.text)
                             output_text = "\n".join(parts)
                             thread_res.append(output_text or "Empty response from Gemini model...")
                         else:
                             thread_res.append("Empty response from Gemini model...")
                     except Exception as exc:
                         thread_err.append(exc)
                     finally:
                         try:
                             new_loop.run_until_complete(new_loop.shutdown_asyncgens())
                             if hasattr(new_loop, "shutdown_default_executor"):
                                 new_loop.run_until_complete(new_loop.shutdown_default_executor())
                         except:
                             pass
                         new_loop.close()
                         
                t = threading.Thread(target=_run_async_credits)
                t.start()
                t.join()
                
                if thread_err:
                     raise thread_err[0]
                     
                if isinstance(info, dict):
                    info["model"] = actual_model_used[0]
                return thread_res[0]
        except Exception as e:
            LOG.warning("ComfyUI Credits failed. Reason: %s. Falling back to custom keys...", e)

    cfg = proxy_svc.SERVICES.get("gemini", {})
    proxypath = "v1/chat/completions"
    
    actual_model_used = model or cfg.get("default_model", "gemini-3.5-flash")
    if isinstance(info, dict):
        info["model"] = actual_model_used

    body = {
        "model": actual_model_used,
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
        err_msg = str(e)
        if "getaddrinfo failed" in err_msg or "11001" in err_msg:
            raise Exception(
                f"Failed to query Gemini API: {err_msg}. This network error usually occurs when the host cannot be resolved. "
                "If your credentials or API key are defined in an external node, make sure to execute the FULL workflow (Queue Prompt) "
                "rather than running only this group/node, so that the API key is successfully propagated."
            )
        raise Exception(f"Failed to query Gemini API: {err_msg}")

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
    Also strip image_url blocks from all older history messages to avoid payload bloat.
    """
    if not api_messages:
        return

    # 1. If the last message is a user message, check if it already has an image.
    last_msg = api_messages[-1]
    if last_msg.get("role") == "user":
        has_image = False
        if isinstance(last_msg.get("content"), list):
            has_image = any(part.get("type") == "image_url" for part in last_msg["content"])
        
        # 2. If it doesn't have an image, find the most recent image in history.
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

    # 3. Strip image_url from all user messages except the very last one.
    for msg in api_messages[:-1]:
        if msg.get("role") == "user" and isinstance(msg.get("content"), list):
            new_content = [part for part in msg["content"] if part.get("type") != "image_url"]
            if len(new_content) == 1 and new_content[0].get("type") == "text":
                msg["content"] = new_content[0].get("text", "")
            elif len(new_content) > 1:
                msg["content"] = new_content
            else:
                msg["content"] = ""

# region Chatbot311
class Chatbot311:
    @classmethod
    def INPUT_TYPES(cls):
        inputs = {
            "required": {
                "mode": (["LLM Chat (Pause & Confirm)", "LLM One-Shot (Immediate)", "Manual (Pause & Confirm)", "Manual One-Shot (Immediate)", "Bypass (Pass Last Output)"], {
                    "default": "LLM Chat (Pause & Confirm)"
                }),
                "sound_alert": ("BOOLEAN", {
                    "default": True,
                    "label_on": "On",
                    "label_off": "Off"
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
                "system_general": ("STRING", {"forceInput": True, "multiline": True}),
                "system_variable": ("STRING", {"forceInput": True, "multiline": True}),
            },
            "hidden": {
                "node_id": "UNIQUE_ID",
                "auth_token_comfy_org": "AUTH_TOKEN_COMFY_ORG",
            }
        }
        for i in range(1, 21):
            inputs["required"][f"starting_delimiter_{i}"] = ("STRING", {"default": f"<prompt_{i}>"})
            inputs["required"][f"ending_delimiter_{i}"] = ("STRING", {"default": f"</prompt_{i}>"})
        inputs["required"]["use_comfyui_credits"] = ("BOOLEAN", {
            "default": True,
            "label_on": "Use ComfyUI Credits",
            "label_off": "Use Custom API Keys"
        })
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
        
        mode = kwargs.get("mode", "LLM Chat (Pause & Confirm)")
        actual_mode = mode[0] if isinstance(mode, list) else mode
        
        # Map old mode names to new ones for backward compatibility
        if actual_mode == "Interactive Chat (Pause)":
            actual_mode = "LLM Chat (Pause & Confirm)"
        elif actual_mode == "One-Shot Prompt":
            actual_mode = "LLM One-Shot (Immediate)"
        elif actual_mode == "LLM Disabled (Manual)":
            actual_mode = "Manual (Pause & Confirm)"
        elif actual_mode == "Pass Last Output (Bypass)":
            actual_mode = "Bypass (Pass Last Output)"
        
        sound_alert = kwargs.get("sound_alert", True)
        if isinstance(sound_alert, list):
            sound_alert = sound_alert[0]
            
        node_id = kwargs.get("node_id")
        node_id = str(node_id) if node_id is not None else ""
        
        api_key = kwargs.get("api_key", "")
        if isinstance(api_key, list):
            api_key = api_key[0] if api_key else ""
        api_key = api_key.strip()
        
        use_comfyui_credits = kwargs.get("use_comfyui_credits", True)
        if isinstance(use_comfyui_credits, list):
            use_comfyui_credits = use_comfyui_credits[0] if use_comfyui_credits else True
            
        auth_token_comfy_org = kwargs.get("auth_token_comfy_org", "")
        if isinstance(auth_token_comfy_org, list):
            auth_token_comfy_org = auth_token_comfy_org[0] if auth_token_comfy_org else ""
        
        # Cache the token for sidebar proxy requests
        if auth_token_comfy_org:
            global _CACHED_COMFY_ORG_TOKEN
            _CACHED_COMFY_ORG_TOKEN = auth_token_comfy_org
            LOG.debug("Cached ComfyUI Org auth token from workflow execution.")
        
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
        
        # 1. Determine the base/general system prompt
        gen_prompt = system_general_str
        if not gen_prompt or not gen_prompt.strip():
            # Fallback to file
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
            if prompt_str and prompt_str.strip():
                user_parts.append({"type": "text", "text": prompt_str.strip()})
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
        # Check if we should skip auto-execution in interactive/manual pause modes when there is no graph prompt or UI draft
        should_query_llm = True
        if actual_mode in ("LLM Chat (Pause & Confirm)", "Manual (Pause & Confirm)") and not prompt_str.strip() and not has_draft:
            if image is not None:
                # We have input images in a pause-and-confirm mode.
                # Display the images in the chat history without query or text description,
                # so the user can see them and type their prompt.
                should_query_llm = False
            else:
                has_new_input = False

        if has_new_input and is_really_new:
            user_message = {
                "role": "user",
                "content": user_parts if len(user_parts) > 1 else (user_parts[0]["text"] if user_parts[0]["type"] == "text" else user_parts)
            }
            history.append(user_message)
            
            # Send intermediate update so the client displays the user's input/images immediately
            if node_id:
                try:
                    PromptServer.instance.send_sync("chatbot311-update-history", {
                        "node_id": node_id,
                        "history": history,
                        "clear_draft": has_draft
                    })
                except Exception as e:
                    LOG.error("Failed to emit intermediate user message update: %s", e)
            
            # Query Gemini synchronously
            if actual_mode in ("LLM Chat (Pause & Confirm)", "LLM One-Shot (Immediate)"):
                if should_query_llm:
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
                        info = {}
                        try:
                            assistant_response = query_gemini_sync(api_messages, model, api_key=api_key, use_comfyui_credits=use_comfyui_credits, auth_token_comfy_org=auth_token_comfy_org, info=info)
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
                        err_msg = str(e)
                        if "API key not valid" in err_msg or "valid API key" in err_msg:
                            friendly = "⚠️ **API Key Missing:** Please configure your Gemini API Key in the `api_key` widget of this node."
                        elif "rate_limited" in err_msg or "429" in err_msg or "quota" in err_msg.lower():
                            friendly = "⚠️ **Rate Limit Exceeded:** You have exceeded the API request quota. Please wait a moment before trying again."
                        elif "getaddrinfo failed" in err_msg or "11001" in err_msg:
                            friendly = (
                                "⚠️ **Connection / API Key Error:** Failed to resolve the Gemini API host (getaddrinfo failed). "
                                "This network error usually indicates that the hostname could not be resolved.\n\n"
                                "**Solution:** If your API key is defined in an external node (e.g., outside this group), "
                                "please ensure you execute the **FULL workflow** (Queue Prompt) rather than running only this group/node, "
                                "so that all credentials and inputs are properly propagated."
                            )
                        else:
                            friendly = f"Execution Error: {err_msg}"
                        history.append({"role": "assistant", "content": friendly})
                    
                    # Send websocket update back to frontend chat panel so it syncs instantly without reload
                    if node_id:
                        try:
                            PromptServer.instance.send_sync("chatbot311-update-history", {
                                "node_id": node_id,
                                "history": history,
                                "clear_draft": has_draft,
                                "model": info.get("model", model)
                            })
                        except Exception as e:
                            LOG.error("Failed to emit websocket update: %s", e)
                else:
                    # Just update the history with the images so the frontend shows them
                    if node_id:
                        try:
                            PromptServer.instance.send_sync("chatbot311-update-history", {
                                "node_id": node_id,
                                "history": history,
                                "clear_draft": False
                            })
                        except Exception as e:
                            LOG.error("Failed to emit websocket update: %s", e)
            elif actual_mode in ("Manual (Pause & Confirm)", "Manual One-Shot (Immediate)"):
                if should_query_llm:
                    # Wrap the user's text in the first active delimiter
                    num_delimiters = kwargs.get("number_of_delimiters", 1)
                    if isinstance(num_delimiters, list):
                        num_delimiters = num_delimiters[0]
                    count = int(num_delimiters)
                    start_d = "<prompt_1>"
                    end_d = "</prompt_1>"
                    if count >= 1:
                        start_d = kwargs.get("starting_delimiter_1", "<prompt_1>")
                        end_d = kwargs.get("ending_delimiter_1", "</prompt_1>")
                    
                    # Get the plain text from user_parts
                    user_text = ""
                    for part in user_parts:
                        if isinstance(part, dict) and part.get("type") == "text":
                            user_text += part.get("text", "")
                        elif isinstance(part, str):
                            user_text += part
                    
                    wrapped_text = f"{start_d}\n{user_text.strip()}\n{end_d}"
                    history.append({"role": "assistant", "content": wrapped_text})
                    
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
                else:
                    # Just update the history with the images so the frontend shows them
                    if node_id:
                        try:
                            PromptServer.instance.send_sync("chatbot311-update-history", {
                                "node_id": node_id,
                                "history": history,
                                "clear_draft": False
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
        if actual_mode in ("LLM Chat (Pause & Confirm)", "Manual (Pause & Confirm)") and node_id:
            # We register the pause session
            event = Event()
            CHAT_SESSIONS[node_id] = {
                "event": event,
                "history": history,
                "action": None,
                "api_key": api_key,
                "auth_token_comfy_org": auth_token_comfy_org,
                "system_general": system_general_str,
                "system_variable": system_variable_str
            }
            
            # Send notification to UI that we are paused and waiting for confirmation
            try:
                PromptServer.instance.send_sync("chatbot311-chat-paused", {
                    "node_id": node_id,
                    "sound_alert": sound_alert,
                    "api_key": api_key,
                    "system_general": system_general_str,
                    "system_variable": system_variable_str
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
        elif actual_mode == "LLM One-Shot (Immediate)" and not has_new_input:
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
                    
                    LOG.info(f"Querying Gemini ({model}) with system instruction in LLM One-Shot (Immediate) mode (from widget)...")
                    if node_id:
                        try:
                            PromptServer.instance.send_sync("chatbot311-show-typing", {
                                "node_id": node_id,
                                "show": True
                            })
                        except Exception:
                            pass
                    info = {}
                    try:
                        assistant_response = query_gemini_sync(api_messages, model, api_key=api_key, use_comfyui_credits=use_comfyui_credits, auth_token_comfy_org=auth_token_comfy_org, info=info)
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
                    err_msg = str(e)
                    if "API key not valid" in err_msg or "valid API key" in err_msg:
                        friendly = "⚠️ **API Key Missing:** Please configure your Gemini API Key in the `api_key` widget of this node."
                    elif "rate_limited" in err_msg or "429" in err_msg or "quota" in err_msg.lower():
                        friendly = "⚠️ **Rate Limit Exceeded:** You have exceeded the API request quota. Please wait a moment before trying again."
                    elif "getaddrinfo failed" in err_msg or "11001" in err_msg:
                        friendly = (
                            "⚠️ **Connection / API Key Error:** Failed to resolve the Gemini API host (getaddrinfo failed). "
                            "This network error usually indicates that the hostname could not be resolved.\n\n"
                            "**Solution:** If your API key is defined in an external node (e.g., outside this group), "
                            "please ensure you execute the **FULL workflow** (Queue Prompt) rather than running only this group/node, "
                            "so that all credentials and inputs are properly propagated."
                        )
                    else:
                        friendly = f"Execution Error: {err_msg}"
                    history.append({"role": "assistant", "content": friendly})
                    if node_id:
                        try:
                            PromptServer.instance.send_sync("chatbot311-update-history", {
                                "node_id": node_id,
                                "history": history,
                                "model": info.get("model", model)
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

        # Resolve the model name
        model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")
        actual_model = info.get("model") if 'info' in locals() and "model" in info else ui_widget.get("config", {}).get("lastUsedModel", model)
        if "config" not in ui_widget or not isinstance(ui_widget["config"], dict):
            ui_widget["config"] = {}
        ui_widget["config"]["lastUsedModel"] = actual_model

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
