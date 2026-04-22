import time
import logging
import re
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import Counter, Histogram

logger = logging.getLogger("jd-crm.metrics")

# Prometheus Metrics Definitions
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests handled",
    ["method", "endpoint", "http_status"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"]
)

class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/metrics", "/health"]: # Exclude internal polling
            return await call_next(request)
            
        start_time = time.time()
        status_code = 500
        
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception as e:
            status_code = 500
            raise e
        finally:
            process_time = time.time() - start_time
            
            # Collapse numeric IDs to avoid cardinality explosion in Prometheus
            path = request.url.path
            collapsed_path = re.sub(r'/\d+', '/{id}', path)
            
            try:
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=collapsed_path,
                    http_status=str(status_code)
                ).inc()
                
                REQUEST_LATENCY.labels(
                    method=request.method,
                    endpoint=collapsed_path
                ).observe(process_time)
            except Exception as prom_e:
                logger.error(f"Prometheus error: {prom_e}")

            logger.info(
                f"Method: {request.method} | Path: {collapsed_path} | "
                f"Status: {status_code} | Duration: {process_time:.4f}s"
            )
