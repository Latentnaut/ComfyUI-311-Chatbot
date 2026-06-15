import os
import re
import json
import logging
from pathlib import Path
from typing import List

_LOG = logging.getLogger(__name__)

# region Constants
class Input:
    CHAT_311 = "CHAT_311"
    JSON = "JSON"
    STRING = "STRING"

API_ROUTE_PREFIX = "/chatbot-311"
CATEGORY = "🤖 Chatbot-311"
FUNCTION = "on_exec"
# endregion

# region .env Loader
def maybe_load_dotenv(path: Path) -> None:
    """
    Load a simple .env file into os.environ without external deps.
    """
    if not path.exists():
        return
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k:
                v_clean = v.strip()
                # If the value in .env is a real key, always overwrite the environment variable to allow runtime changes.
                # If it's a placeholder, only set it if no value is currently present.
                if v_clean.lower() not in ("your_api_key_here", "undefined", "null", "none"):
                    os.environ[k] = v_clean
                elif not os.environ.get(k):
                    os.environ[k] = v_clean
    except Exception:
        _LOG.exception("failed to load .env at %s", path)
# endregion

# region normalize_json_input
def normalize_json_input(input_val):
    """
    Normalize input JSON-like data into a standard Python object.
    """
    def convert_python_to_json(input_str):
        return re.sub(r"(?<!\")'([^']*)'(?!\")", r'"\1"', input_str)
    
    if isinstance(input_val, dict) or input_val is None:
        return input_val
    
    elif isinstance(input_val, str):
        stripped = input_val.strip()
        if stripped == "":
            return {}
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            try:
                return json.loads(convert_python_to_json(stripped))
            except json.JSONDecodeError:
                return {}
    
    elif isinstance(input_val, list):
        if all(isinstance(i, dict) for i in input_val):
            return input_val
        elif len(input_val) == 1 and isinstance(input_val[0], str):
            candidate = input_val[0].strip()
            if candidate == "":
                return {}
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                return json.loads(convert_python_to_json(candidate))
        else:
            normalized_list = []
            for item in input_val:
                if isinstance(item, str):
                    candidate = item.strip()
                    if candidate == "":
                        normalized_list.append({})
                        continue
                    try:
                        normalized_list.append(json.loads(candidate))
                    except json.JSONDecodeError:
                        try:
                            normalized_list.append(json.loads(convert_python_to_json(candidate)))
                        except json.JSONDecodeError:
                            normalized_list.append({})
                else:
                    normalized_list.append(item)
            return normalized_list
    else:
        raise TypeError(f"Unsupported input type: {type(input_val)}")
# endregion
