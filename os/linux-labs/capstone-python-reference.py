#!/usr/bin/env python3
"""Eight independent Python capstone implementations (teacher reference).
Set CHALLENGE = 'srtf' etc. One scenario per line, q scenarios per input.
The real student-verify.cjs executes these implementations; there is no
JavaScript oracle import or hardcoded expected output.
"""
import sys

CHALLENGE = "choose"


def solve_srtf(a):
    n, k = int(a[0]), 1
    jobs = []
    for i in range(n):
        at, bt = int(a[k]), int(a[k+1])
        jobs.append(dict(i=i, at=at, bt=bt, remain=bt, first=-1, finish=-1))
        k += 2
    clock, finished = 0, 0
    while finished < n:
        ready = sorted((j for j in jobs if j["at"] <= clock and j["remain"] > 0),
                       key=lambda j: (j["remain"], j["at"], j["i"]))
        if not ready:
            clock = min(j["at"] for j in jobs if j["remain"] > 0)
            continue
        chosen = ready[0]
        if chosen["first"] < 0:
            chosen["first"] = clock
        chosen["remain"] -= 1
        clock += 1
        if chosen["remain"] == 0:
            chosen["finish"] = clock
            finished += 1
    return "{} {}".format(
        sum(j["finish"] - j["at"] - j["bt"] for j in jobs),
        sum(j["first"] - j["at"] for j in jobs))


def solve_lru(a):
    cap, count = int(a[0]), int(a[1])
    frames, hits = [], 0
    for page in map(int, a[2:2 + count]):
        if page in frames:
            hits += 1
            frames.remove(page)
        elif len(frames) == cap:
            frames.pop(0)
        frames.append(page)
    return "{} {}".format(count - hits, hits)


def solve_banker(a):
    n, avail_a, avail_b = map(int, a[:3])
    work = [avail_a, avail_b]
    alloc, need, k = [], [], 3
    for _ in range(n):
        v = list(map(int, a[k:k + 4]))
        alloc.append(v[:2])
        need.append([v[2] - v[0], v[3] - v[1]])
        k += 4
    done, order = set(), []
    for _ in range(n):
        chosen = next((i for i in range(n)
                       if i not in done and all(need[i][j] <= work[j]
                                                for j in range(2))), None)
        if chosen is None:
            return "UNSAFE"
        done.add(chosen)
        order.append(chosen)
        work = [work[j] + alloc[chosen][j] for j in range(2)]
    return "SAFE " + " ".join(map(str, order))


def solve_pagetable(a):
    size, vpn, pfn, present, writable, executable = map(int, a[:6])
    access, va = a[6], int(a[7])
    if not present or va // size != vpn:
        return "PAGE_FAULT"
    if (access == "W" and not writable) or (access == "X" and not executable):
        return "PROTECTION"
    return str(pfn * size + va % size)


def solve_clock(a):
    bits = list(map(int, a[:3]))
    hand, count = int(a[3]), int(a[4])
    chosen = []
    for _ in range(count):
        while bits[hand] == 1:
            bits[hand] = 0
            hand = (hand + 1) % 3
        chosen.append(hand)
        bits[hand] = 1
        hand = (hand + 1) % 3
    return ",".join(map(str, chosen)) + " " + "".join(map(str, bits))


def solve_journal(a):
    value, count = int(a[0]), 0
    for i in range(1, 7, 2):
        proposal, commit = int(a[i]), int(a[i+1])
        if commit == 1:
            value, count = proposal, count + 1
    return "{} {}".format(value, count)


def solve_alloc(a):
    blocks = list(map(int, a[:3]))
    chosen = []
    for need in map(int, a[3:6]):
        index = next((i for i, space in enumerate(blocks) if space >= need), -1)
        chosen.append(index)
        if index >= 0:
            blocks[index] -= need
    return "{} | {}".format(" ".join(map(str, chosen)), " ".join(map(str, blocks)))


def solve_epoll(a):
    mode, take = a[0], int(a[1])
    remaining, notifications = 0, 0
    for arrival in map(int, a[2:5]):
        remaining += arrival
        if (mode == "LT" and remaining > 0) or (mode == "ET" and arrival > 0):
            notifications += 1
            remaining -= min(take, remaining)
    return "{} {}".format(notifications, remaining)


SOLVERS = {
    "srtf": solve_srtf, "lru": solve_lru, "banker": solve_banker,
    "pagetable": solve_pagetable, "clock": solve_clock,
    "journal": solve_journal, "alloc": solve_alloc, "epoll": solve_epoll,
}


def main():
    if CHALLENGE not in SOLVERS:
        raise ValueError("Select a challenge before running this reference")
    lines = sys.stdin.read().strip().splitlines()
    if not lines:
        return
    count = int(lines[0])
    if len(lines) != count + 1:
        raise ValueError("Wrong number of case lines")
    for line in lines[1:]:
        print(SOLVERS[CHALLENGE](line.split()))


if __name__ == "__main__":
    main()
