#!/usr/bin/env bash
# 下載執行環境到 shared/code/vendor/（不進 git）。版本要和 runtime.js 的 vendorDir 與 Worker 一致。
# npm pack 會依 registry 的 integrity 驗證套件；這裡只取出執行需要的檔案。
set -euo pipefail
cd "$(dirname "$0")/.."   # shared/code/
PYODIDE=314.0.7
CLANG=22.0.0-git20542-10
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
fetch() { (cd "$tmp" && npm pack --silent "$1" >/dev/null && mkdir -p "$2" && tar xzf ./*.tgz -C "$2" --strip-components=1 && rm ./*.tgz); }
if [ ! -f "vendor/pyodide-$PYODIDE/pyodide.asm.wasm" ]; then
  fetch "pyodide@$PYODIDE" py
  mkdir -p "vendor/pyodide-$PYODIDE"
  cp "$tmp"/py/{pyodide.mjs,pyodide.asm.mjs,pyodide.asm.wasm,python_stdlib.zip,pyodide-lock.json,package.json} "vendor/pyodide-$PYODIDE/"
fi
if [ ! -f "vendor/yowasp-clang-$CLANG/gen/llvm.core.wasm" ]; then
  fetch "@yowasp/clang@$CLANG" cc
  mkdir -p "vendor/yowasp-clang-$CLANG"
  cp -r "$tmp"/cc/gen "$tmp"/cc/package.json "vendor/yowasp-clang-$CLANG/"
  cp "$tmp"/cc/LICENSE* "vendor/yowasp-clang-$CLANG/" 2>/dev/null || true
fi
du -sh vendor/*
