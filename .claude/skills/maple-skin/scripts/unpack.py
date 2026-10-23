"""Unpack exported WZ zips (including zips nested inside zips) into one folder per upload.

Exporters on Windows often write Chinese file names without the UTF-8 flag; those
names are recovered from cp437. Entries that would escape the target folder are skipped.

    python3 -I unpack.py OUT_DIR upload1.zip [upload2.zip ...]
"""
import os
import sys
import zipfile


def entry_name(info):
    name = info.filename
    if not info.flag_bits & 0x800:
        try:
            name = name.encode("cp437").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    return name


def unpack(path, dest):
    count = 0
    with zipfile.ZipFile(path) as z:
        for info in z.infolist():
            rel = os.path.normpath(entry_name(info))
            if info.is_dir() or rel.startswith("..") or os.path.isabs(rel):
                continue
            target = os.path.join(dest, rel)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "wb") as f:
                f.write(z.read(info))
            count += 1
            if target.lower().endswith(".zip"):
                count += unpack(target, target[:-4])
    return count


if __name__ == "__main__":
    out = sys.argv[1]
    for src in sys.argv[2:]:
        dest = os.path.join(out, os.path.splitext(os.path.basename(src))[0])
        print(dest, unpack(src, dest))
