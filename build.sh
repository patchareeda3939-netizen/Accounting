#!/usr/bin/env bash
# รวมไฟล์ใน src/ เป็นไฟล์เว็บไฟล์เดียว
set -e
cd "$(dirname "$0")"
mkdir -p dist
{
  echo '<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>PSMacc</title></head><body>'
  cat src/shell.html
  echo '<script>'
  cat src/part*.js
  echo '</script></body></html>'
} > dist/index.html
# ไฟล์สำหรับเผยแพร่เป็น Claude Artifact (ไม่มี doctype/head ระบบใส่ให้เอง)
{ cat src/shell.html; echo '<script>'; cat src/part*.js; echo '</script>'; } > dist/artifact.html
echo "built dist/index.html ($(wc -c < dist/index.html) bytes)"
