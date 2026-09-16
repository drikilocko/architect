"""
Compress all .mp4 videos in the Architect project using FFmpeg.
Uses H.264 (libx264) CRF=26 for great visual quality at ~60-75% smaller file size.
H.265 skipped for broad browser compatibility.
Originals backed up to backup_originals/ before overwriting.
Run: python compress_videos.py
"""

import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(r'c:\xampp\htdocs\Architect')
BACKUP_DIR = ROOT / 'backup_originals'
BACKUP_DIR.mkdir(exist_ok=True)
SKIP_DIRS = {'.gemini', '.qodo', 'node_modules', 'backup_originals'}

# CRF 23-28: lower = better quality & larger file. 26 = very good quality, big savings.
CRF = 26

videos = []
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in files:
        if f.lower().endswith('.mp4'):
            videos.append(Path(dirpath) / f)

total_before = 0
total_after = 0

for vpath in videos:
    size_before = vpath.stat().st_size
    total_before += size_before
    rel = vpath.relative_to(ROOT)

    # Backup original
    backup_path = BACKUP_DIR / rel
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    if not backup_path.exists():
        shutil.copy2(vpath, backup_path)

    # Temporary output file
    tmp_out = vpath.with_suffix('.compressed.mp4')

    cmd = [
        'ffmpeg', '-y', '-i', str(vpath),
        '-c:v', 'libx264',
        '-crf', str(CRF),
        '-preset', 'slow',      # better compression (takes more time but worth it)
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',   # web-optimized: metadata at start
        str(tmp_out)
    ]

    print(f'\nCompressing: {rel}  ({size_before/1024/1024:.1f} MB)')
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0 and tmp_out.exists():
        size_after = tmp_out.stat().st_size
        # Only replace if we actually saved space
        if size_after < size_before:
            tmp_out.replace(vpath)
            total_after += size_after
            saved_pct = 100 * (size_before - size_after) / size_before
            print(f'  [OK] {size_before/1024/1024:.1f} MB -> {size_after/1024/1024:.1f} MB  (-{saved_pct:.0f}%)')
        else:
            tmp_out.unlink()
            total_after += size_before
            print(f'  [SKIP] Output was larger than original, keeping original.')
    else:
        if tmp_out.exists():
            tmp_out.unlink()
        total_after += size_before
        print(f'  [ERR] FFmpeg failed: {result.stderr[-300:]}')

print()
print('=' * 60)
print(f'Videos processed : {len(videos)}')
print(f'Total before     : {total_before/1024/1024:.1f} MB')
print(f'Total after      : {total_after/1024/1024:.1f} MB')
print(f'Space saved      : {(total_before-total_after)/1024/1024:.1f} MB')
print(f'Originals saved in: {BACKUP_DIR}')
