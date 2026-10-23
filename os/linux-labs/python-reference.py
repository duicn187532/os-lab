#!/usr/bin/env python3
"""OS LAB teacher reference for 29 chapter Judge problems (not Linux syscall labs).
To generate a per-chapter standalone submission, replace CHAPTER = -1 with
CHAPTER = 0..28. See tests/os-all-python-ac.cjs, which invokes the exact
student-verify.cjs source grader for all 29 chapters. This implementation
does NOT use or import the repository's JavaScript answer oracle.
"""
import sys

CHAPTER = -1


def solve(chapter, values):
    t = values
    a = [int(s) if s.lstrip("-").isdigit() else s for s in t]
    if chapter == 0:
        return str(a[0] + a[1])
    if chapter == 1:
        return "ERROR" if a[0] < 0 else "ZERO" if a[0] == 0 else "SUCCESS"
    if chapter in (2, 14):
        return str(1 << a[0])
    if chapter == 3:
        return "PRIVATE" if t[0] in ("STACK", "PC", "REG") else "SHARED"
    if chapter == 4:
        jobs = [(a[2 * i], a[2 * i + 1], i) for i in range(3)]
        jobs.sort(key=lambda j: (j[0], j[2]))
        time, waits = 0, [0] * 3
        for at, bt, index in jobs:
            start = max(time, at)
            waits[index] = start - at
            time = start + bt
        return " ".join(map(str, waits))
    if chapter == 5:
        return str(a[0] + 1)
    if chapter == 6:
        return "{} {}".format(a[0] // a[1], a[0] % a[1])
    if chapter == 7:
        capacity, n = a[:2]
        frames, faults = [], 0
        for page in a[2:2 + n]:
            if page not in frames:
                faults += 1
                if len(frames) == capacity:
                    frames.pop(0)
                frames.append(page)
        return str(faults)
    if chapter == 8:
        return str(a[0] + a[1] - a[2])
    if chapter == 9:
        return "READ" if a[0] > 0 else "EAGAIN" if a[1] == 1 else "BLOCK"
    if chapter == 10:
        index = {"O": 0, "G": 1, "U": 2}.get(t[3], 2)
        mask = {"R": 4, "W": 2, "X": 1}[t[4]]
        return "ALLOW" if a[index] & mask else "DENY"
    if chapter == 11:
        return str(100 * a[0] // a[1])
    if chapter == 12:
        return str(a[0] * a[1])
    if chapter == 13:
        intervals = sorted((a[i], a[i + 1]) for i in range(0, 8, 2))
        total, end = 0, -1
        for start, stop in intervals:
            total += max(0, stop - max(start, end))
            end = max(end, stop)
        return str(total)
    if chapter == 15:
        return {"SAVE": "STORAGE", "RUN": "SCHED", "LOCK": "SYNC",
                "FSYNC": "SYNCIO", "WAIT": "PROCESS", "MAP": "MEMORY"}[t[0]]
    if chapter == 16:
        return "{} {}".format(a[0] - a[1], a[1])
    if chapter == 17:
        available = a[:2]
        allocation = [a[2:4], a[6:8]]
        maximum = [a[4:6], a[8:10]]
        need = [[maximum[i][j] - allocation[i][j] for j in range(2)]
                for i in range(2)]
        finish, order = [False, False], []
        while len(order) < 2:
            found = next((i for i in range(2) if not finish[i]
                          and all(need[i][j] <= available[j] for j in range(2))), None)
            if found is None:
                return "UNSAFE"
            finish[found] = True
            order.append("P" + str(found))
            for j in range(2):
                available[j] += allocation[found][j]
        return "SAFE " + "".join(order)
    if chapter == 18:
        blocks = a[:3]
        chosen = []
        for need in a[3:]:
            match = next((i for i, size in enumerate(blocks) if size >= need), -1)
            chosen.append(match)
            if match >= 0:
                blocks[match] -= need
        return " ".join(map(str, chosen))
    if chapter == 19:
        head = a[0]
        fcfs = 0
        for target in a[1:]:
            fcfs += abs(head - target)
            head = target
        pending, head, sstf = list(a[1:]), a[0], 0
        while pending:
            target = min(pending, key=lambda x: (abs(x - head), x))
            sstf += abs(head - target)
            head = target
            pending.remove(target)
        return "{} {}".format(fcfs, sstf)
    if chapter == 20:
        return str(0 if a[2] else min(2, a[0] + 1) if a[1] else a[0])
    if chapter == 21:
        return str({"FW": 0, "BOOT": 1, "KERNEL": 2, "ROOT": 3, "INIT": 4}[t[0]])
    if chapter == 22:
        return "DATA" if a[1] > 0 else "EOF" if a[0] == 0 else "BLOCK"
    if chapter == 23:
        return str(a.index(1)) if 1 in a else "WAIT"
    if chapter == 24:
        mode, writer, original, replacement = t[0], t[1], t[2], t[3]
        if mode != "PRIVATE":
            return replacement + " " + replacement
        if writer == "P":
            return replacement + " " + original
        return original + " " + replacement
    if chapter == 25:
        r, hand, chosen = a[:3], a[3], []
        for _ in range(3):
            while r[hand]:
                r[hand] = 0
                hand = (hand + 1) % 3
            chosen.append(hand)
            r[hand] = 1
            hand = (hand + 1) % 3
        return " ".join(map(str, chosen + [hand]))
    if chapter == 26:
        old, new = a[:2]
        state = 0
        for event in t[2:]:
            if event == "X":
                break
            if event == "L" and state == 0:
                state = 1
            elif event == "C" and state == 1:
                state = 2
            elif event == "A" and state == 2:
                state = 3
            else:
                return "INVALID"
        return str(new if state >= 2 else old)
    if chapter == 27:
        return "NOTIFY" if ((t[0] == "LT" and a[1] > 0) or
                            (t[0] != "LT" and a[2] == 1)) else "NO"
    if chapter == 28:
        return {"MEMORY": "PROC", "CPU_QUOTA": "CGROUP", "SYSCALL": "STRACE",
                "IO_WAIT": "IOSTAT", "CPU_HOT": "PERF"}[t[0]]
    raise ValueError("Unsupported OS chapter " + str(chapter))


def main():
    if CHAPTER not in range(29):
        raise ValueError("Select CHAPTER 0..28 when preparing a reference submission")
    lines = sys.stdin.read().strip().splitlines()
    if not lines:
        return
    count = int(lines[0])
    if len(lines) != count + 1:
        raise ValueError("Expected one scenario per line")
    for line in lines[1:]:
        print(solve(CHAPTER, line.split()))


if __name__ == "__main__":
    main()
