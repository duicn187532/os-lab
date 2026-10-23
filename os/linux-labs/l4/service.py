#!/usr/bin/env python3
"""OS LAB L4: local-only threaded HTTP service with a reproducible lock convoy.

Usage:
 python3 os/linux-labs/l4/service.py --mode serialized --port 8099 --log /tmp/os-l4.log
 python3 os/linux-labs/l4/service.py --mode reduced-lock --port 8099 --log /tmp/os-l4.log

Only binds 127.0.0.1. Deliberate *educational* bottleneck, not production code.
"""
import argparse
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

parser = argparse.ArgumentParser()
parser.add_argument("--mode", required=True, choices=("serialized", "reduced-lock"))
parser.add_argument("--port", type=int, default=8099)
parser.add_argument("--log", required=True)
args = parser.parse_args()
if not 0 <= args.port < 65536:
    parser.error("port must be in 0..65535")

lock = threading.Lock()
stats_lock = threading.Lock()
state = {"requests": 0, "active": 0, "peak_active": 0}
# Open a local append-only log; writes and optional fsync remain protected by lock.
log_fd = os.open(args.log, os.O_CREAT | os.O_WRONLY | os.O_APPEND, 0o600)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def json_response(self, status, data):
        raw = json.dumps(data, sort_keys=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        url = urlsplit(self.path)
        if url.path == "/health":
            return self.json_response(200, {"status": "ok", "mode": args.mode})
        if url.path == "/stats":
            with stats_lock:
                snapshot = dict(state)
            return self.json_response(200, {"mode": args.mode, **snapshot})
        if url.path != "/work":
            return self.json_response(404, {"error": "unknown endpoint"})
        p = parse_qs(url.query)
        try:
            io_ms = int(p.get("io_ms", ["15"])[0])
            cpu_steps = int(p.get("cpu_steps", ["1000"])[0])
            mem_kib = int(p.get("mem_kib", ["64"])[0])
            seq = int(p.get("seq", ["0"])[0])
        except (ValueError, IndexError):
            return self.json_response(400, {"error": "invalid parameters"})
        if not (0 <= io_ms <= 100 and 0 <= cpu_steps <= 200000 and
                0 <= mem_kib <= 4096 and 0 <= seq <= 10000000):
            return self.json_response(400, {"error": "parameters out of bounds"})
        begin = time.perf_counter()
        with stats_lock:
            state["active"] += 1
            state["peak_active"] = max(state["peak_active"], state["active"])
        try:
            # Touch each page to produce measurable memory activity, then release.
            scratch = bytearray(mem_kib * 1024)
            for j in range(0, len(scratch), 4096):
                scratch[j] = 1
            checksum = 0
            for j in range(cpu_steps):
                checksum = (checksum * 33 + j + 1) & 0xFFFFFFFF

            def work_inside_lock():
                time.sleep(io_ms / 1000)  # deterministic model of waiting for I/O
                os.write(log_fd, ("%d,%d\n" % (seq, checksum)).encode())
                os.fsync(log_fd)

            if args.mode == "serialized":
                with lock:
                    work_inside_lock()
            else:
                # The wait can proceed concurrently; only shared log mutation locks.
                time.sleep(io_ms / 1000)
                with lock:
                    os.write(log_fd, ("%d,%d\n" % (seq, checksum)).encode())
                    os.fsync(log_fd)
            with stats_lock:
                state["requests"] += 1
            duration_ms = (time.perf_counter() - begin) * 1000
            return self.json_response(200, {
                "seq": seq, "checksum": checksum, "duration_ms": round(duration_ms, 3)
            })
        finally:
            with stats_lock:
                state["active"] -= 1


try:
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print("READY %d" % server.server_port, flush=True)
    server.serve_forever(poll_interval=0.1)
finally:
    os.close(log_fd)
