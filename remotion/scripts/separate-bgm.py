# clean.mp4 오디오에서 보컬(원장 한국어) 제거 → BGM(no_vocals) 추출.
# demucs 모델로 분리하되, torchaudio.save(=torchcodec 의존) 우회하고 soundfile로 저장.
#   python scripts/separate-bgm.py <in.wav> <out_bgm.wav>
import sys
import numpy as np
import soundfile as sf
import torch
from demucs.pretrained import get_model
from demucs.apply import apply_model

inp, outp = sys.argv[1], sys.argv[2]
data, sr = sf.read(inp, dtype="float32")          # (N, C)
if data.ndim == 1:
    data = np.stack([data, data], axis=1)
wav = torch.from_numpy(data.T).contiguous().float()  # (C, N)

model = get_model("htdemucs")
model.eval()
assert sr == model.samplerate, f"sr {sr} != model {model.samplerate}"

ref = wav.mean(0)
mean, std = ref.mean(), ref.std()
wavn = (wav - mean) / (std + 1e-8)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"device={device} sources={model.sources}")
with torch.no_grad():
    sources = apply_model(model, wavn[None], device=device, split=True, overlap=0.25, progress=True)[0]
sources = sources * std + mean                    # (S, C, N)

names = list(model.sources)
voc = sources[names.index("vocals")]
no_voc = sources.sum(0) - voc                     # 모든 스템 합 - 보컬 = BGM
sf.write(outp, no_voc.T.cpu().numpy(), sr)
print(f"saved {outp} shape={tuple(no_voc.shape)} sr={sr}")
