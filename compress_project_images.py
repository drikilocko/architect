"""
compress_project_images.py — ARTECH Project Modal Image Optimizer
Redimensionne et recompresse les images des dossiers utilisés dans le popup projets.
Nécessite Pillow : pip install Pillow

USAGE : python compress_project_images.py
Les originaux sont conservés dans un sous-dossier "_originals/"
"""

from PIL import Image
import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Dossiers projets à optimiser
TARGET_FOLDERS = [
    "assets/palais des congres",
    "assets/Photo_Hotel_2_Fevrier",
    "projet",
    "produit",
    "assets/projet takoradi",
    "assets/baguida",
    "assets/kegue",
]

# Paramètres adaptés au popup projets
MAX_WIDTH = 1600
JPEG_QUALITY = 82
BACKUP = True

extensions = (".jpg", ".jpeg", ".JPG", ".JPEG", ".png", ".PNG")

total_before = 0
total_after = 0
count = 0

for folder in TARGET_FOLDERS:
    folder_path = os.path.join(BASE_DIR, folder)
    if not os.path.isdir(folder_path):
        print(f"[SKIP] Dossier introuvable : {folder_path}")
        continue

    backup_dir = os.path.join(folder_path, "_originals")
    if BACKUP and not os.path.exists(backup_dir):
        os.makedirs(backup_dir)

    files = [f for f in os.listdir(folder_path) if f.endswith(extensions)]
    print(f"\n[FOLDER] {folder}/ — {len(files)} image(s) trouvee(s)")

    for filename in files:
        src_path = os.path.join(folder_path, filename)
        size_before = os.path.getsize(src_path)
        total_before += size_before

        try:
            with Image.open(src_path) as img:
                if img.mode in ("RGBA", "P", "CMYK"):
                    img = img.convert("RGB")

                w, h = img.size
                if w > MAX_WIDTH:
                    ratio = MAX_WIDTH / w
                    new_size = (MAX_WIDTH, int(h * ratio))
                    img = img.resize(new_size, Image.LANCZOS)

                if BACKUP:
                    backup_path = os.path.join(backup_dir, filename)
                    if not os.path.exists(backup_path):
                        shutil.copy2(src_path, backup_path)

                out_path = os.path.splitext(src_path)[0] + ".jpg"
                img.save(out_path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)

                if src_path != out_path and os.path.exists(src_path):
                    os.remove(src_path)

            size_after = os.path.getsize(out_path)
            total_after += size_after
            count += 1
            reduction = (1 - size_after / size_before) * 100
            print(f"  [OK] {filename:45s} {size_before/1024/1024:.1f} MB -> {size_after/1024:.0f} KB  (-{reduction:.0f}%)")

        except Exception as e:
            print(f"  [ERR] {filename}: {e}")

print("\n" + "="*60)
print(f"[DONE] {count} image(s) optimisee(s)")
print(f"   Avant  : {total_before/1024/1024:.1f} MB")
print(f"   Apres  : {total_after/1024/1024:.1f} MB")
if total_before > 0:
    print(f"   Gain   : {(1 - total_after/total_before)*100:.0f}% de reduction")
print(f"\nOriginaux sauvegardes dans chaque dossier/_originals/")
