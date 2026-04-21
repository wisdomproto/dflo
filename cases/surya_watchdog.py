"""Watchdog wrapper for surya_batch.py.

Launches the OCR batch as a subprocess and restarts it whenever no new
raw JSON file has appeared for STALL_SECONDS. Exits cleanly once the
pending list is empty.
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW_DIR = Path(r"C:/projects/dflo_0.1/cases/랩데이터_ocr/_raw")
BATCH_SCRIPT = HERE / "surya_batch.py"
LOG_FILE = Path("/tmp/surya.log")
STALL_SECONDS = 300    # kill + restart if no new file within this window
POLL_SECONDS = 30      # how often the watchdog checks progress


def file_count() -> int:
    return sum(1 for _ in RAW_DIR.rglob("*.raw.json"))


def pending_count() -> int:
    sys.path.insert(0, str(HERE))
    from surya_batch import collect_pending  # type: ignore
    return len(collect_pending(None, False))


def launch() -> subprocess.Popen:
    log = open(LOG_FILE, "a", encoding="utf-8", buffering=1)
    log.write(f"\n=== watchdog launch {time.strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    log.flush()
    env_prefix = []  # PYTHONUNBUFFERED is set via -u below
    return subprocess.Popen(
        [sys.executable, "-u", str(BATCH_SCRIPT)],
        stdout=log, stderr=subprocess.STDOUT,
    )


def main() -> None:
    while True:
        pend = pending_count()
        if pend == 0:
            print("watchdog: done - 0 pending", flush=True)
            return
        print(f"watchdog: {pend} pending - launching surya_batch", flush=True)
        proc = launch()
        last_count = file_count()
        last_change = time.time()
        while True:
            time.sleep(POLL_SECONDS)
            rc = proc.poll()
            if rc is not None:
                print(f"watchdog: surya exited rc={rc}", flush=True)
                break
            n = file_count()
            if n > last_count:
                gained = n - last_count
                last_count = n
                last_change = time.time()
                print(f"watchdog: +{gained} file(s) → {n} total", flush=True)
                continue
            elapsed = time.time() - last_change
            if elapsed > STALL_SECONDS:
                print(
                    f"watchdog: STALL {int(elapsed)}s no new file - killing pid={proc.pid}",
                    flush=True,
                )
                proc.terminate()
                try:
                    proc.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    try:
                        proc.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        pass
                print("watchdog: killed, will relaunch", flush=True)
                break


if __name__ == "__main__":
    main()
