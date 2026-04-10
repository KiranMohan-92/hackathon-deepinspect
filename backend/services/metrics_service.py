"""In-process metrics for DeepInspect. No external dependency required."""
import threading
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class MetricSummary:
    count: int = 0
    total_ms: float = 0.0

    @property
    def avg_ms(self) -> float:
        return self.total_ms / self.count if self.count else 0.0


_lock = threading.Lock()

# Counters
_analyses_total: dict[str, int] = defaultdict(int)  # by (tier, status)
_agent_duration: dict[str, MetricSummary] = defaultdict(MetricSummary)
_requests: dict[str, int] = defaultdict(int)  # by (method, path, status)
_circuit_breaker_opens: dict[str, int] = defaultdict(int)


def record_analysis(tier: str, status: str = "completed"):
    with _lock:
        _analyses_total[f"{tier}:{status}"] += 1


def record_agent_duration(agent_name: str, duration_ms: float):
    with _lock:
        summary = _agent_duration[agent_name]
        summary.count += 1
        summary.total_ms += duration_ms


def record_request(method: str, path: str, status: int, duration_ms: float):
    with _lock:
        _requests[f"{method}:{path}:{status}"] += 1


def record_circuit_breaker_open(breaker_name: str):
    with _lock:
        _circuit_breaker_opens[breaker_name] += 1


def snapshot_metrics() -> dict:
    with _lock:
        return {
            "analyses_total": dict(_analyses_total),
            "agent_duration": {k: {"count": v.count, "avg_ms": v.avg_ms} for k, v in _agent_duration.items()},
            "requests": dict(_requests),
            "circuit_breaker_opens": dict(_circuit_breaker_opens),
        }


def prometheus_text() -> str:
    """Export metrics in Prometheus text exposition format."""
    lines = []
    with _lock:
        lines.append("# HELP deepinspect_analyses_total Total bridge analyses by tier and status")
        lines.append("# TYPE deepinspect_analyses_total counter")
        for key, count in _analyses_total.items():
            tier, status = key.split(":", 1)
            lines.append(f'deepinspect_analyses_total{{tier="{tier}",status="{status}"}} {count}')

        lines.append("# HELP deepinspect_agent_duration_ms Agent execution duration")
        lines.append("# TYPE deepinspect_agent_duration_ms summary")
        for agent, summary in _agent_duration.items():
            lines.append(f'deepinspect_agent_duration_count{{agent="{agent}"}} {summary.count}')
            lines.append(f'deepinspect_agent_duration_sum_ms{{agent="{agent}"}} {summary.total_ms:.1f}')

        lines.append("# HELP deepinspect_circuit_breaker_opens Circuit breaker open events")
        lines.append("# TYPE deepinspect_circuit_breaker_opens counter")
        for name, count in _circuit_breaker_opens.items():
            lines.append(f'deepinspect_circuit_breaker_opens{{breaker="{name}"}} {count}')

    return "\n".join(lines) + "\n"


def reset_metrics():
    with _lock:
        _analyses_total.clear()
        _agent_duration.clear()
        _requests.clear()
        _circuit_breaker_opens.clear()
