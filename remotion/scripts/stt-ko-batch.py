# 재배포 40개 원본의 한국어 음성 → 세그먼트 STT (faster-whisper large-v3, GPU).
# 입력: out/shorts/repurpose-ko/_manifest.json 의 id 들 → sources/originals/{id}.mp4
# 출력: out/_work/stt/{id}.json  (멱등: 있으면 skip)
import json, os
from faster_whisper import WhisperModel

root = "C:/projects/dflo_0.1/remotion"
manifest = json.load(open(f"{root}/out/shorts/repurpose-ko/_manifest.json", encoding="utf-8"))
outdir = f"{root}/out/_work/stt"
os.makedirs(outdir, exist_ok=True)

dev, ct = "cuda", "float16"
try:
    model = WhisperModel("large-v3", device=dev, compute_type=ct)
except Exception as e:
    print(f"CUDA 실패 → CPU: {e}", flush=True)
    dev, ct = "cpu", "int8"
    model = WhisperModel("large-v3", device=dev, compute_type=ct)
print(f"model loaded ({dev}/{ct}). {len(manifest)} videos", flush=True)

done = skip = miss = 0
for i, item in enumerate(manifest, 1):
    vid = item["id"]
    out = f"{outdir}/{vid}.json"
    if os.path.exists(out):
        skip += 1; print(f"[{i}/{len(manifest)}] skip {vid}", flush=True); continue
    mp4 = f"{root}/sources/originals/{vid}.mp4"
    if not os.path.exists(mp4):
        miss += 1; print(f"[{i}/{len(manifest)}] MISSING {mp4}", flush=True); continue
    segments, info = model.transcribe(
        mp4, language="ko", beam_size=5, vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400),
    )
    segs = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments]
    json.dump(segs, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    done += 1
    print(f"[{i}/{len(manifest)}] {vid}: {len(segs)} segs ({info.duration:.0f}s)", flush=True)

print(f"STT DONE — {done} new, {skip} skip, {miss} missing", flush=True)
