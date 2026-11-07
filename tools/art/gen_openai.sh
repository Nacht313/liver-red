#!/bin/bash
# 用 curl 呼叫 OpenAI 圖片 API（不需要 python 的 openai 套件）。用法：bash gen_curl.sh 提示詞檔 輸出.png [尺寸]
set -e
PROMPT_FILE="$1"; OUT="$2"; SIZE="${3:-1536x1024}"; MODEL="${MODEL:-gpt-image-2.5-sunburst}"
BODY=$(/usr/bin/python3 -c 'import json,sys;print(json.dumps({"model":sys.argv[1],"prompt":open(sys.argv[2]).read(),"size":sys.argv[3],"n":1}))' "$MODEL" "$PROMPT_FILE" "$SIZE")
RESP=$(curl -sS https://api.openai.com/v1/images/generations -H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" -d "$BODY")
echo "$RESP" | /usr/bin/python3 -c '
import json,sys,base64
r=json.load(sys.stdin)
if "data" not in r: print("ERROR", json.dumps(r)[:400]); sys.exit(1)
open(sys.argv[1],"wb").write(base64.b64decode(r["data"][0]["b64_json"])); print("OK", sys.argv[1], r.get("usage",""))
' "$OUT"
