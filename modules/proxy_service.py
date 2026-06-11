import os
import logging
import json
from aiohttp import web
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlsplit

LOG = logging.getLogger(__name__)

# Config focusing strictly on Gemini API
SERVICES: Dict[str, Dict[str, Any]] = {
    "gemini": {
        "endpoint": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        "api_key_env": "GEMINI_API_KEY",
        "api_key_header": "X-goog-api-key",
        "default_model": os.environ.get("GEMINI_MODEL", "gemini-3.5-flash"),
        "timeout": 60,
    }
}

def _read_secret(env_name: str, file_env_name: Optional[str] = None) -> Optional[str]:
    # Try reading environment variable directly
    val = os.environ.get(env_name)
    if val:
        return val
    return None

PROXY_SECRET = None
PROXY_SECRET_HEADER = "X-Proxy-Secret"

def _build_upstream_and_headers(cfg: Dict[str, Any], body: Dict[str, Any], proxypath: Optional[str], user_api_key: Optional[str] = None) -> Tuple[str, Dict[str, str], int, Dict[str, Any]]:
    headers: Dict[str, str] = {}
    timeout = int(cfg.get("timeout", 60))
    
    key = (user_api_key or "").strip()
    
    # Debug logging
    env_key = os.environ.get("GEMINI_API_KEY")
    try:
        from pathlib import Path
        log_file = Path(__file__).resolve().parent.parent / "debug_key.txt"
        log_file.write_text(
            f"user_api_key: {repr(user_api_key)}\n"
            f"env_api_key: {repr(env_key)}\n"
            f"key_after_strip: {repr(key)}\n",
            encoding="utf-8"
        )
        LOG.info(f"[Chatbot311 Debug] user_api_key={repr(user_api_key)}, env_api_key={repr(env_key)}, key_after_strip={repr(key)}")
    except Exception as e:
        LOG.error("Failed to write debug_key.txt: %s", e)
        
    import re
    if (not key or 
        key.lower() in ("undefined", "null", "none", "your_api_key_here") or 
        "optional" in key.lower() or 
        "defaults to env" in key.lower() or
        "api key or proxy" in key.lower() or
        re.match(r'^</?[a-z_]+\d*>$', key, re.IGNORECASE)):
        key = _read_secret(cfg.get("api_key_env", "GEMINI_API_KEY"))

    base_url = "https://generativelanguage.googleapis.com"
    api_token = key

    # If key starts with http:// or https://, treat it as a proxy base URL
    if key and key.startswith(("http://", "https://")):
        base_url = key.rstrip("/")
        api_token = "PROXY_ENCAPSULATED_TOKEN"

    if proxypath:
        upstream = base_url.rstrip("/") + "/" + proxypath.lstrip("/")
    else:
        model = body.get("model") or cfg.get("default_model")
        path = "/v1beta/models/{model}:generateContent".format(model=model)
        upstream = base_url.rstrip("/") + path

    forward_body = body
    if isinstance(forward_body, dict):
        forward_body = dict(forward_body)
        if "model" not in forward_body:
            forward_body["model"] = cfg.get("default_model", "gemini-3.5-flash")

    # Map OpenAI-compatible endpoints (like v1/chat/completions) to Gemini's beta openai endpoint
    if proxypath and proxypath.lstrip("/").startswith("v1/"):
        upstream = base_url.rstrip("/") + "/v1beta/openai/" + proxypath.lstrip("/")
        if api_token:
            headers["Authorization"] = f"Bearer {api_token}"
        # Strip fields not supported by Gemini's OpenAI-compatible endpoint
        if isinstance(forward_body, dict):
            for unsupported in ("frequency_penalty", "presence_penalty", "seed"):
                forward_body.pop(unsupported, None)
    else:
        # Standard endpoint
        if api_token:
            headers[cfg.get("api_key_header", "X-goog-api-key")] = api_token

    return upstream, headers, timeout, forward_body

def _check_rate_limit(client_id: str, service: str, cfg: dict) -> Tuple[bool, int]:
    return True, 0

def _get_client_id(request: web.Request) -> str:
    try:
        if getattr(request, "remote", None):
            return str(request.remote)
        transport = request.transport
        if transport is not None:
            peer = transport.get_extra_info("peername")
            if peer and isinstance(peer, (list, tuple)) and len(peer) >= 1:
                return str(peer[0])
    except Exception:
        pass
    return "unknown"
