import aiohttp
import asyncio
import json
import logging
import uuid
from aiohttp import web
from time import time
from typing import Any, Dict
from pathlib import Path
from datetime import datetime

from server import PromptServer
from .chatbot_utils import API_ROUTE_PREFIX
from . import proxy_service as proxy_svc

LOG = logging.getLogger(__name__)

# region Proxy endpoint (POST)
@PromptServer.instance.routes.post(f"{API_ROUTE_PREFIX}/proxy/{{service}}")
async def proxy_service(request: web.Request) -> web.Response:
    try:
        service = request.match_info.get("service", "")
        cfg = proxy_svc.SERVICES.get(service)
        if cfg is None:
            return web.json_response({"detail": f"unknown_service: {service}"}, status=404)

        try:
            client_id = proxy_svc._get_client_id(request)
            allowed, retry_after = proxy_svc._check_rate_limit(client_id, service, cfg)
            if not allowed:
                return web.json_response({"detail": "rate_limited"}, status=429, headers={"Retry-After": str(retry_after)})
        except Exception:
            LOG.exception("Rate limiter check failed; proceeding without limiting")

        trace_id = uuid.uuid4().hex[:8]

        try:
            body_text = await request.text()
        except Exception:
            body_text = ""

        try:
            body = json.loads(body_text) if body_text else {}
        except Exception:
            body = {}

        upstream, headers, timeout, forward_body = proxy_svc._build_upstream_and_headers(cfg, body, proxypath=None)

        async with aiohttp.ClientSession() as sess:
            try:
                async with sess.post(upstream, json=forward_body, headers=headers, timeout=timeout) as resp:
                    is_streaming = bool(body.get("stream")) or upstream.endswith("/stream")
                    content_type = resp.headers.get("Content-Type", "")

                    if is_streaming:
                        sresp = web.StreamResponse(status=200, reason="OK")
                        sresp.content_type = "text/event-stream"
                        sresp.headers["Cache-Control"] = "no-cache"
                        sresp.headers["Connection"] = "keep-alive"
                        await sresp.prepare(request)

                        try:
                            async for chunk in resp.content.iter_chunked(1024):
                                if not chunk:
                                    continue
                                try:
                                    text_chunk = chunk.decode("utf-8", errors="replace")
                                except Exception:
                                    text_chunk = str(chunk)

                                # Forward raw SSE
                                lines = text_chunk.splitlines()
                                if any(l.lstrip().startswith("data:") or l.lstrip().startswith("event:") for l in lines):
                                    raw = text_chunk
                                    if not raw.endswith("\n\n"):
                                        raw = raw + "\n\n"
                                else:
                                    raw = "".join(f"data: {l}\n" for l in lines) + "\n\n"

                                try:
                                    await sresp.write(raw.encode("utf-8"))
                                    await sresp.drain()
                                except (ConnectionResetError, asyncio.CancelledError):
                                    break
                            return sresp
                        finally:
                            try:
                                await sresp.write_eof()
                            except Exception:
                                pass

                    # Non-streaming path
                    text = await resp.text()
                    if "application/json" in content_type.lower():
                        try:
                            data = await resp.json()
                        except Exception:
                            return web.Response(text=text or "", status=resp.status, content_type="application/json")

                        if isinstance(data, dict):
                            data.setdefault("http_status", resp.status)
                            return web.json_response(data, status=resp.status)
                        else:
                            return web.json_response({"result": data, "http_status": resp.status}, status=resp.status)
                    else:
                        return web.Response(text=text or "", status=resp.status, content_type=content_type or "text/plain")
            except aiohttp.ClientError as exc:
                LOG.exception("Upstream request to %s failed: %s", upstream, exc)
                return web.json_response({"detail": "upstream_error", "error": str(exc)}, status=502)
    except Exception as exc_outer:
        LOG.exception("Proxy handler failed: %s", exc_outer)
        return web.json_response({"detail": "proxy_error", "error": str(exc_outer)}, status=500)
# endregion

# region Proxy service status (GET)
@PromptServer.instance.routes.get(f"{API_ROUTE_PREFIX}/proxy/{{service}}")
async def proxy_service_status(request: web.Request) -> web.Response:
    try:
        service = request.match_info.get("service", "")
        cfg = proxy_svc.SERVICES.get(service)
        if cfg is None:
            return web.json_response({"detail": f"unknown_service: {service}"}, status=404)

        ready = False
        reason = None

        api_env = cfg.get("api_key_env")
        if api_env:
            key = proxy_svc._read_secret(api_env)
            ready = bool(key)
            if not ready:
                reason = f"missing {api_env}"
        else:
            ready = True

        payload = {"service": service, "ready": ready}
        if reason and not ready:
            payload["reason"] = reason
        return web.json_response(payload, status=200 if ready else 503)
    except Exception as exc:
        LOG.exception("Proxy status check failed: %s", exc)
        return web.json_response({"detail": "proxy_error", "error": str(exc)}, status=500)
# endregion

# region Proxy service with path (POST)
@PromptServer.instance.routes.post(f"{API_ROUTE_PREFIX}/proxy/{{service}}/{{proxypath:.*}}")
async def proxy_service_with_path(request: web.Request) -> web.Response:
    try:
        service = request.match_info.get("service", "")
        proxypath = request.match_info.get("proxypath", "")
        cfg = proxy_svc.SERVICES.get(service)
        if cfg is None:
            return web.json_response({"detail": f"unknown_service: {service}"}, status=404)

        try:
            client_id = proxy_svc._get_client_id(request)
            allowed, retry_after = proxy_svc._check_rate_limit(client_id, service, cfg)
            if not allowed:
                return web.json_response({"detail": "rate_limited"}, status=429, headers={"Retry-After": str(retry_after)})
        except Exception:
            LOG.exception("Rate limiter check failed; proceeding without limiting")

        try:
            body_text = await request.text()
        except Exception:
            body_text = ""

        try:
            body = json.loads(body_text) if body_text else {}
        except Exception:
            body = {}

        upstream, headers, timeout, forward_body = proxy_svc._build_upstream_and_headers(cfg, body, proxypath=proxypath)

        async with aiohttp.ClientSession() as sess:
            try:
                async with sess.post(upstream, json=forward_body, headers=headers, timeout=timeout) as resp:
                    is_streaming = bool(body.get("stream")) or upstream.endswith("/stream") or (proxypath or "").endswith("/stream")
                    content_type = resp.headers.get("Content-Type", "")

                    if is_streaming:
                        sresp = web.StreamResponse(status=200, reason="OK")
                        sresp.content_type = "text/event-stream"
                        sresp.headers["Cache-Control"] = "no-cache"
                        sresp.headers["Connection"] = "keep-alive"
                        await sresp.prepare(request)

                        try:
                            async for chunk in resp.content.iter_chunked(1024):
                                if not chunk:
                                    continue
                                try:
                                    text_chunk = chunk.decode("utf-8", errors="replace")
                                except Exception:
                                    text_chunk = str(chunk)

                                # Forward raw SSE
                                lines = text_chunk.splitlines()
                                if any(l.lstrip().startswith("data:") or l.lstrip().startswith("event:") for l in lines):
                                    raw = text_chunk
                                    if not raw.endswith("\n\n"):
                                        raw = raw + "\n\n"
                                else:
                                    raw_sse = "".join(f"data: {l}\n" for l in lines) + "\n\n"
                                    raw = raw_sse

                                try:
                                    await sresp.write(raw.encode("utf-8"))
                                    await sresp.drain()
                                except (ConnectionResetError, asyncio.CancelledError):
                                    break
                            return sresp
                        finally:
                            try:
                                await sresp.write_eof()
                            except Exception:
                                pass

                    # Non-streaming path
                    text = await resp.text()
                    if "application/json" in content_type.lower():
                        try:
                            data = await resp.json()
                        except Exception:
                            return web.Response(text=text or "", status=resp.status, content_type="application/json")

                        if isinstance(data, dict):
                            data.setdefault("http_status", resp.status)
                            return web.json_response(data, status=resp.status)
                        else:
                            return web.json_response({"result": data, "http_status": resp.status}, status=resp.status)
                    else:
                        return web.Response(text=text or "", status=resp.status, content_type=content_type or "text/plain")
            except aiohttp.ClientError as exc:
                LOG.exception("Upstream request to %s failed: %s", upstream, exc)
                return web.json_response({"detail": "upstream_error", "error": str(exc)}, status=502)
    except Exception as exc_outer:
        LOG.exception("Proxy handler failed: %s", exc_outer)
        return web.json_response({"detail": "proxy_error", "error": str(exc_outer)}, status=500)
# endregion

# region Conversations & System Prompt Management
CONVS_DIR = Path(__file__).resolve().parent.parent / "conversations"
CONVS_DIR.mkdir(parents=True, exist_ok=True)

@PromptServer.instance.routes.get(f"{API_ROUTE_PREFIX}/conversations")
async def list_conversations(request: web.Request) -> web.Response:
    try:
        convs = []
        for p in CONVS_DIR.glob("*.json"):
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                convs.append({
                    "id": data.get("id", p.stem),
                    "name": data.get("name", "Untitled Chat"),
                    "updated_at": data.get("updated_at", datetime.fromtimestamp(p.stat().st_mtime).isoformat())
                })
            except Exception:
                LOG.error(f"Failed to read conversation file: {p.name}")
        
        # Sort by updated_at desc
        convs.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return web.json_response(convs)
    except Exception as e:
        LOG.exception("Failed listing conversations: %s", e)
        return web.json_response({"detail": "error", "error": str(e)}, status=500)

@PromptServer.instance.routes.get(f"{API_ROUTE_PREFIX}/conversations/{{id}}")
async def get_conversation(request: web.Request) -> web.Response:
    try:
        conv_id = request.match_info.get("id", "")
        file_path = CONVS_DIR / f"{conv_id}.json"
        if not file_path.exists():
            return web.json_response({"detail": "not_found"}, status=404)
            
        data = json.loads(file_path.read_text(encoding="utf-8"))
        return web.json_response(data)
    except Exception as e:
        LOG.exception("Failed getting conversation %s: %s", conv_id, e)
        return web.json_response({"detail": "error", "error": str(e)}, status=500)

@PromptServer.instance.routes.post(f"{API_ROUTE_PREFIX}/conversations")
async def save_conversation(request: web.Request) -> web.Response:
    try:
        body = await request.json()
        conv_id = body.get("id")
        if not conv_id:
            conv_id = uuid.uuid4().hex[:12]
            
        history = body.get("history", [])
        name = body.get("name")
        
        # Generate name if missing
        if not name or not name.strip():
            name = "Untitled Chat"
            if history:
                first_msg = history[0]
                content = first_msg.get("content", "")
                if isinstance(content, list):
                    text_parts = [part.get("text", "") for part in content if part.get("type") == "text"]
                    name = " ".join(text_parts)[:30].strip() or "Image Chat"
                elif isinstance(content, str):
                    name = content[:30].strip()
            if not name:
                name = "Untitled Chat"
                
        updated_at = datetime.now().isoformat()
        
        data = {
            "id": conv_id,
            "name": name,
            "history": history,
            "updated_at": updated_at
        }
        
        file_path = CONVS_DIR / f"{conv_id}.json"
        file_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        
        return web.json_response(data)
    except Exception as e:
        LOG.exception("Failed saving conversation: %s", e)
        return web.json_response({"detail": "error", "error": str(e)}, status=500)

@PromptServer.instance.routes.delete(f"{API_ROUTE_PREFIX}/conversations/{{id}}")
async def delete_conversation(request: web.Request) -> web.Response:
    try:
        conv_id = request.match_info.get("id", "")
        file_path = CONVS_DIR / f"{conv_id}.json"
        if file_path.exists():
            file_path.unlink()
            return web.json_response({"status": "success", "id": conv_id})
        return web.json_response({"detail": "not_found"}, status=404)
    except Exception as e:
        LOG.exception("Failed deleting conversation %s: %s", conv_id, e)
        return web.json_response({"detail": "error", "error": str(e)}, status=500)

@PromptServer.instance.routes.get(f"{API_ROUTE_PREFIX}/system-prompt")
async def get_default_system_prompt(request: web.Request) -> web.Response:
    try:
        sys_file = Path(__file__).resolve().parent.parent / "system_prompt.md"
        content = ""
        if sys_file.exists():
            content = sys_file.read_text(encoding="utf-8")
        return web.json_response({"system_prompt": content})
    except Exception as e:
        LOG.exception("Failed loading default system prompt: %s", e)
        return web.json_response({"detail": "error", "error": str(e)}, status=500)
# endregion

