"""
Compress images in place (JPG/PNG → re-saved with optimized quality).
- JPG/JPEG: saved at quality=82, optimize=True (usually ~3x-10x smaller for huge files)
- PNG: saved with optimize=True
- Skips files already under 300 KB
- Creates a .backup folder with original files (safety)
Run: python compress_all.py
"""

import os
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(r'c:\xampp\htdocs\Architect')
SKIP_DIRS = {'.gemini', '.qodo', 'node_modules', 'backup_originals', '.git', '__pycache__'}
SKIP_MIN_SIZE = 300 * 1024   # Skip files already under 300 KB
JPEG_QUALITY = 82            # 75-85 = great visual quality, big savings
MAX_DIMENSION = 2400         # Resize if larger than this (px) on longest side

BACKUP_DIR = ROOT / 'backup_originals'
BACKUP_DIR.mkdir(exist_ok=True)

total_before = 0
total_after = 0
count = 0

for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fname in files:
        ext = Path(fname).suffix.lower()
        if ext not in ('.jpg', '.jpeg', '.png'):
            continue
        fpath = Path(dirpath) / fname
        size_before = fpath.stat().st_size

        if size_before < SKIP_MIN_SIZE:
            continue

        # Backup original
        rel = fpath.relative_to(ROOT)
        backup_path = BACKUP_DIR / rel
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        if not backup_path.exists():
            shutil.copy2(fpath, backup_path)

        try:
            img = Image.open(fpath)
            # Convert RGBA/P to RGB for JPEG saving
            if img.mode in ('RGBA', 'P', 'LA'):
                if ext in ('.jpg', '.jpeg'):
                    img = img.convert('RGB')
            
            # Resize if too large
            w, h = img.size
            max_dim = max(w, h)
            if max_dim > MAX_DIMENSION:
                scale = MAX_DIMENSION / max_dim
                new_w = int(w * scale)
                new_h = int(h * scale)
                img = img.resize((new_w, new_h), Image.LANCZOS)
                print(f"  Resized {w}x{h} -> {new_w}x{new_h}")

            if ext in ('.jpg', '.jpeg'):
                img.save(fpath, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
            elif ext == '.png':
                img.save(fpath, 'PNG', optimize=True, compress_level=7)

            size_after = fpath.stat().st_size
            saved = size_before - size_after
            pct = (saved / size_before) * 100

            total_before += size_before
            total_after += size_after
            count += 1

            print(f"[OK] {rel}  {size_before/1024/1024:.2f}MB -> {size_after/1024/1024:.2f}MB  (-{pct:.0f}%)")
        except Exception as e:
            print(f"[ERR] {rel}: {e}")

print()
print("=" * 60)
print(f"Files processed : {count}")
print(f"Total before    : {total_before/1024/1024:.1f} MB")
print(f"Total after     : {total_after/1024/1024:.1f} MB")
print(f"Space saved     : {(total_before-total_after)/1024/1024:.1f} MB  ({100*(total_before-total_after)/max(total_before,1):.0f}%)")
print(f"Originals saved in: {BACKUP_DIR}")
