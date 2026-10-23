#!/usr/bin/env python3
"""Local WAL process-crash laboratory. It is NOT a power-loss simulation.

Usage (Linux/WSL2):
  python3 wal-recovery-demo.py init /tmp/wal-demo.jsonl 10
  python3 wal-recovery-demo.py write /tmp/wal-demo.jsonl T1 20 before_commit
  python3 wal-recovery-demo.py recover /tmp/wal-demo.jsonl
  python3 wal-recovery-demo.py write /tmp/wal-demo.jsonl T2 30 after_fsync
  python3 wal-recovery-demo.py recover /tmp/wal-demo.jsonl

Record type: BASE -> BEGIN+SET -> COMMIT. Only complete, well-formed
COMMIT records are replayed. A crash before COMMIT leaves pending changes.
The after_fsync case issues a REAL fsync before _exit; it tests process
recovery, not OS crash, disk cache, torn sector or journaling guarantees.
"""
import json
import os
import pathlib
import sys


def row(kind, **fields):
    return json.dumps({"kind": kind, **fields}, separators=(",", ":")) + "\n"


def initialize(filename, value):
    filename.parent.mkdir(parents=True, exist_ok=True)
    with filename.open("x", encoding="utf-8") as log:
        log.write(row("BASE", value=value))
        log.flush()
        os.fsync(log.fileno())
    # On POSIX, syncing the containing directory helps persist creation.
    directory = os.open(str(filename.parent), os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)
    print("initialized=" + str(value))


def transaction(filename, txid, value, fault):
    if not txid.isalnum() or len(txid) > 40:
        raise ValueError("Transaction id must be 1..40 alphanumeric characters")
    if fault not in {"none", "before_commit", "after_fsync"}:
        raise ValueError("Unsupported fault injection point")
    if not filename.is_file():
        raise ValueError("Initialize the WAL before appending records")
    with filename.open("a", encoding="utf-8") as log:
        log.write(row("BEGIN", tx=txid))
        log.write(row("SET", tx=txid, value=value))
        log.flush()
        if fault == "before_commit":
            os._exit(71)  # Simulated app process crash; changes lack COMMIT
        log.write(row("COMMIT", tx=txid))
        log.flush()
        os.fsync(log.fileno())
        if fault == "after_fsync":
            os._exit(72)  # Durable commit has completed, no response emitted
    print("committed=" + txid)


def recover(filename):
    baseline = None
    committed = 0
    pending = {}
    torn_tail = 0
    raw = filename.read_bytes()
    lines = raw.split(b"\n")
    for index, data in enumerate(lines):
        if not data:
            if index == len(lines) - 1:
                continue
            raise ValueError("Unexpected empty record in WAL")
        try:
            record = json.loads(data.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            if index != len(lines) - 1:
                raise ValueError("Invalid record in the middle of WAL")
            torn_tail = 1
            break
        kind = record.get("kind")
        if kind == "BASE":
            if baseline is not None or index != 0 or not isinstance(record.get("value"), int):
                raise ValueError("Invalid BASE record")
            baseline = record["value"]
        elif kind == "BEGIN":
            tx = record.get("tx")
            if not isinstance(tx, str) or tx in pending:
                raise ValueError("Invalid BEGIN record")
            pending[tx] = None
        elif kind == "SET":
            tx, value = record.get("tx"), record.get("value")
            if tx not in pending or not isinstance(value, int):
                raise ValueError("SET has no pending transaction")
            pending[tx] = value
        elif kind == "COMMIT":
            tx = record.get("tx")
            if tx not in pending or pending[tx] is None:
                raise ValueError("COMMIT has no complete transaction")
            baseline = pending.pop(tx)
            committed += 1
        else:
            raise ValueError("Unknown WAL record kind")
    if baseline is None:
        raise ValueError("No baseline value in WAL")
    print("value={0} committed={1} pending={2} torn_tail={3}".format(
        baseline, committed, len(pending), torn_tail))


def main():
    argv = sys.argv[1:]
    if len(argv) == 3 and argv[0] == "init":
        initialize(pathlib.Path(argv[1]), int(argv[2]))
    elif len(argv) == 2 and argv[0] == "recover":
        recover(pathlib.Path(argv[1]))
    elif len(argv) in (4, 5) and argv[0] == "write":
        transaction(pathlib.Path(argv[1]), argv[2], int(argv[3]),
                    argv[4] if len(argv) == 5 else "none")
    else:
        raise ValueError("Usage: init LOG VALUE | write LOG TX VALUE [before_commit|after_fsync] | recover LOG")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as err:
        print("WAL error: " + str(err), file=sys.stderr)
        sys.exit(1)
