import logging
from pathlib import Path

# Load .env variables first
from .modules.chatbot_utils import maybe_load_dotenv
repo_root = Path(__file__).resolve().parent
maybe_load_dotenv(repo_root / ".env")

# Register web routes on PromptServer
from .modules import proxy_controller

# Expose class mappings for ComfyUI
from .modules.llm_chat import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

WEB_DIRECTORY = "./web/deploy"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

LOG = logging.getLogger(__name__)
LOG.info("\033[34m*-----------------------------------------------------------*\033[0m")
LOG.info("\033[34m*          ✨ ComfyUI-Chatbot-311 Node Initialized           *\033[0m")
LOG.info("\033[34m*-----------------------------------------------------------*\033[0m")
