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

def _build_upstream_and_headers(cfg: Dict[str, Any], body: Dict[str, Any], proxypath: Optional[str]) -> Tuple[str, Dict[str, str], int, Dict[str, Any]]:
    headers: Dict[str, str] = {}
    timeout = int(cfg.get("timeout", 60))
    key = _read_secret(cfg.get("api_key_env", "GEMINI_API_KEY"))

    if proxypath:
        parts = urlsplit(cfg["endpoint"])
        base = f"{parts.scheme}://{parts.netloc}"
        upstream = base.rstrip("/") + "/" + proxypath.lstrip("/")
    else:
        model = body.get("model") or cfg.get("default_model")
        upstream = cfg["endpoint"].format(model=model)

    forward_body = body
    if isinstance(forward_body, dict):
        forward_body = dict(forward_body)
        if "model" not in forward_body:
            forward_body["model"] = cfg.get("default_model", "gemini-3.5-flash")

    # Map OpenAI-compatible endpoints (like v1/chat/completions) to Gemini's beta openai endpoint
    if proxypath and proxypath.lstrip("/").startswith("v1/"):
        upstream = "https://generativelanguage.googleapis.com/v1beta/openai/" + proxypath.lstrip("/")
        if key:
            headers["Authorization"] = f"Bearer {key}"
        # Strip fields not supported by Gemini's OpenAI-compatible endpoint
        if isinstance(forward_body, dict):
            for unsupported in ("frequency_penalty", "presence_penalty", "seed"):
                forward_body.pop(unsupported, None)
    else:
        # Standard endpoint
        if key:
            headers[cfg.get("api_key_header", "X-goog-api-key")] = key

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
