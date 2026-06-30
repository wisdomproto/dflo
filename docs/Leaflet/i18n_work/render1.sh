#!/bin/bash
LANG=$1; PG=$2
python - "$LANG" "$PG" <<PYEOF
import re,sys
lang,pg=sys.argv[1],sys.argv[2]
html=open(f"dist/{lang}/index.html",encoding="utf-8").read()
sec=re.search(rf'(<section[^>]*>\s*<img[^>]*{pg}\.webp.*?</section>)',html,re.S).group(1)
fit="<script>(function(){function fit(el){var fs=parseFloat(getComputedStyle(el).fontSize);var min=fs*0.5,g=80;while((el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)&&fs>min&&g-->0){fs-=0.5;el.style.fontSize=fs+'px';}}function run(){var ls=document.querySelectorAll('.blk');for(var i=0;i<ls.length;i++)fit(ls[i]);}if(document.readyState!=='loading')run();else document.addEventListener('DOMContentLoaded',run);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run);})();</script>"
open(f"dist/_debug/{lang}_{pg}.html","w",encoding="utf-8").write(f'<!doctype html><html lang="{lang}"><meta charset="utf-8"><link rel="stylesheet" href="../shared/leaflet.css"><body class="leaflet" style="background:#fff;padding:0;gap:0;align-items:flex-start">{sec}{fit}</body></html>')
PYEOF
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --hide-scrollbars --virtual-time-budget=3500 --window-size=794,1123 --screenshot="C:/Users/101024/AppData/Local/Temp/claude/c--projects-dflo-0-1/d4754f14-98d4-454a-b8e5-b4fc6ba2861f/scratchpad/${LANG}_${PG}.png" "http://localhost:8765/dist/_debug/${LANG}_${PG}.html" 2>/dev/null
