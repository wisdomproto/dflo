# 한국어 음성 → 세그먼트(start/end/text) STT. faster-whisper large-v3, GPU(cuda/float16) 우선 CPU 폴백.
# 사용: python scripts/stt-ko.py <mp4> <out.json>
import sys, json, os
from faster_whisper import WhisperModel

mp4, out = sys.argv[1], sys.argv[2]
os.makedirs(os.path.dirname(out), exist_ok=True)

dev, ct = "cuda", "float16"
try:
    model = WhisperModel("large-v3", device=dev, compute_type=ct)
except Exception as e:
    print(f"CUDA init 실패 → CPU 폴백: {e}", file=sys.stderr)
    dev, ct = "cpu", "int8"
    model = WhisperModel("large-v3", device=dev, compute_type=ct)
print(f"model loaded ({dev}/{ct}) — transcribing {os.path.basename(mp4)} …", file=sys.stderr)

segments, info = model.transcribe(
    mp4, language="ko", beam_size=5, vad_filter=True,
    vad_parameters=dict(min_silence_duration_ms=400),
)
segs = []
for s in segments:
    t = s.text.strip()
    segs.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": t})
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {t}", file=sys.stderr)

json.dump(segs, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"DONE {len(segs)} segments (dur {info.duration:.1f}s) -> {out}")
