#!/usr/bin/env python3
"""Automated L4 experiment contract, both variants, no external packages."""
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

here = Path(__file__).resolve().parent


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def check(mode, folder):
    port = free_port()
    log = folder / (mode + ".csv")
    server = subprocess.Popen(
        [sys.executable, str(here / "service.py"), "--mode", mode,
         "--port", str(port), "--log", str(log)],
        stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True
    )
    try:
        url = f"http://127.0.0.1:{port}"
        for _ in range(60):
            if server.poll() is not None:
                raise AssertionError("server exited early: " + server.stderr.read())
            try:
                with urlopen(url + "/health", timeout=0.5) as response:
                    health = json.load(response)
                break
            except (URLError, TimeoutError, ConnectionError):
                time.sleep(0.1)
        else:
            raise AssertionError("server failed readiness check")
        assert health["mode"] == mode
        result = subprocess.run(
            [sys.executable, str(here / "load.py"),
             "--url", url, "--requests", "24", "--concurrency", "6",
             "--io-ms", "12", "--mem-kib", "32", "--cpu-steps", "200"],
            capture_output=True, text=True, timeout=30, check=True
        )
        data = json.loads(result.stdout)
        assert data["mode"] == mode
        assert data["succeeded"] == 24 and data["failed"] == 0
        assert 0 < data["p50_ms"] <= data["p95_ms"] <= data["p99_ms"]
        with urlopen(url + "/stats", timeout=2) as response:
            stats = json.load(response)
        assert stats["requests"] == 24 and stats["active"] == 0
        assert stats["peak_active"] >= 1
        assert len(log.read_text().splitlines()) == 24
        print(mode, "PASS", "p99_ms=", data["p99_ms"],
              "throughput_rps=", data["throughput_rps"])
    finally:
        server.terminate()
        try:
            server.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.communicate(timeout=5)


with tempfile.TemporaryDirectory(prefix="os-l4-test-") as folder:
    for variant in ("serialized", "reduced-lock"):
        check(variant, Path(folder))
print("PASS: L4 variants, health, load, output, log integrity, cleanup")
