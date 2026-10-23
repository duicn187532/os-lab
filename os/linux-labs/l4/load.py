#!/usr/bin/env python3
"""OS LAB L4 local load generator; produces one machine-readable JSON result."""
import argparse
import json
import math
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import urlopen

p = argparse.ArgumentParser()
p.add_argument("--url", default="http://127.0.0.1:8099")
p.add_argument("--requests", type=int, default=40)
p.add_argument("--concurrency", type=int, default=8)
p.add_argument("--io-ms", type=int, default=15)
p.add_argument("--cpu-steps", type=int, default=1000)
p.add_argument("--mem-kib", type=int, default=64)
p.add_argument("--output")
a = p.parse_args()
if not 1 <= a.requests <= 500 or not 1 <= a.concurrency <= 32:
    p.error("requests 1..500 and concurrency 1..32")
if not (0 <= a.io_ms <= 100 and 0 <= a.cpu_steps <= 200000 and 0 <= a.mem_kib <= 4096):
    p.error("workload parameter out of range")

base = a.url.rstrip("/")
if not base.startswith("http://127.0.0.1:") and not base.startswith("http://localhost:"):
    p.error("safety: only local 127.0.0.1/localhost services are supported")


def get_json(url):
    with urlopen(url, timeout=10) as response:
        if response.status != 200:
            raise ValueError("HTTP status %d" % response.status)
        return json.load(response)


mode = get_json(base + "/health")["mode"]


def request(index):
    start = time.perf_counter()
    row = get_json(
        f"{base}/work?seq={index}&io_ms={a.io_ms}"
        f"&cpu_steps={a.cpu_steps}&mem_kib={a.mem_kib}"
    )
    if row["seq"] != index:
        raise ValueError("request ID mismatch")
    return (time.perf_counter() - start) * 1000


start = time.perf_counter()
times = []
errors = []
with ThreadPoolExecutor(max_workers=a.concurrency) as pool:
    futures = [pool.submit(request, i) for i in range(a.requests)]
    for future in as_completed(futures):
        try:
            times.append(future.result())
        except Exception as exc:
            errors.append(str(exc))
elapsed = time.perf_counter() - start
times.sort()


def percentile(pct):
    return round(times[max(0, math.ceil(len(times) * pct) - 1)], 3) if times else None


result = {
    "mode": mode, "requests": a.requests, "succeeded": len(times),
    "failed": len(errors), "errors": errors[:5],
    "concurrency": a.concurrency, "io_ms": a.io_ms,
    "cpu_steps": a.cpu_steps, "mem_kib": a.mem_kib,
    "elapsed_seconds": round(elapsed, 4),
    "throughput_rps": round(len(times) / elapsed, 3) if elapsed else None,
    "mean_ms": round(statistics.mean(times), 3) if times else None,
    "p50_ms": percentile(0.5), "p95_ms": percentile(0.95),
    "p99_ms": percentile(0.99), "max_ms": percentile(1.0)
}
output = json.dumps(result, indent=2, ensure_ascii=False)
print(output)
if a.output:
    with open(a.output, "w", encoding="utf-8") as f:
        f.write(output + "\n")
if errors:
    raise SystemExit(1)
