import time
from typing import Dict, List, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, default_limit: int = 180, auth_limit: int = 20, window_seconds: int = 60):
        super().__init__(app)
        self.default_limit = default_limit
        self.auth_limit = auth_limit
        self.window_seconds = window_seconds
        # client_ip -> list of timestamps
        self.requests: Dict[str, List[float]] = {}
        self.auth_requests: Dict[str, List[float]] = {}
        self.last_cleanup = time.time()

    def _cleanup_stale(self, now: float):
        if now - self.last_cleanup < 120:
            return
        self.last_cleanup = now
        cutoff = now - self.window_seconds
        for ip in list(self.requests.keys()):
            self.requests[ip] = [t for t in self.requests[ip] if t > cutoff]
            if not self.requests[ip]:
                del self.requests[ip]
        for ip in list(self.auth_requests.keys()):
            self.auth_requests[ip] = [t for t in self.auth_requests[ip] if t > cutoff]
            if not self.auth_requests[ip]:
                del self.auth_requests[ip]

    async def dispatch(self, request: Request, call_next):
        # Health checks, WebSockets, and CORS preflight OPTIONS are exempt
        path = request.url.path
        if request.method == "OPTIONS" or path == "/health" or path.startswith("/ws"):
            return await call_next(request)

        # Determine client IP
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        now = time.time()
        self._cleanup_stale(now)
        cutoff = now - self.window_seconds

        # Check Auth Rate Limit
        if path in ("/api/v1/auth/login", "/api/v1/auth/register"):
            timestamps = self.auth_requests.setdefault(client_ip, [])
            timestamps = [t for t in timestamps if t > cutoff]
            self.auth_requests[client_ip] = timestamps
            if len(timestamps) >= self.auth_limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many authentication attempts. Please try again later."},
                    headers={"Retry-After": str(self.window_seconds)}
                )
            timestamps.append(now)

        # Check General API Rate Limit
        timestamps = self.requests.setdefault(client_ip, [])
        timestamps = [t for t in timestamps if t > cutoff]
        self.requests[client_ip] = timestamps
        if len(timestamps) >= self.default_limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please slow down."},
                headers={"Retry-After": str(self.window_seconds)}
            )
        timestamps.append(now)

        return await call_next(request)
