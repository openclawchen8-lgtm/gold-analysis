"""
Agents 模塊 - OpenClaw Agent 框架集成

提供黃金分析系統的多 Agent 協作能力。
"""

from .base import GoldAnalysisAgent
from .coordinator import AgentCoordinator, PipelineStage

__all__ = [
    "GoldAnalysisAgent",
    "AgentCoordinator",
    "PipelineStage",
]
