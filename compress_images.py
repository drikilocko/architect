"""
compress_images.py — ARTECH Service Image Optimizer
Redimensionne et recompresse les images des dossiers de services.
Nécessite Pillow : pip install Pillow

USAGE : python compress_images.py
Les originaux sont conservés dans un sous-dossier "_originals/"
"""

from PIL import Image
import os
import shutil

# === CONFIG ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

# Dossiers à traiter
TARGET_FOLDERS = [
    "escalier",
    "murs",
    "sols",
    "salle de bain",
    "tombe",
    "cuisine",
]

MAX_WIDTH = 1400       # Largeur max en pixels (suffisant pour les cartes galerie)
JPEG_QUALITY = 82      # Qualité JPEG (82% = quasi-indiscernable mais ~10x plus léger)
BACKUP = True          # Conserver les originaux dans _originals/

# === TRAITEMENT ===
extensions = (".jpg", ".jpeg", ".JPG", ".JPEG", ".png", ".PNG")

total_before = 0
total_after = 0
count = 0

for folder in TARGET_FOLDERS:
    folder_path = os.path.join(ASSETS_DIR, folder)
    if not os.path.isdir(folder_path):
        print(f"[SKIP] Dossier introuvable : {folder_path}")
        continue

    # Créer le dossier backup si besoin
    backup_dir = os.path.join(folder_path, "_originals")
    if BACKUP and not os.path.exists(backup_dir):
        os.makedirs(backup_dir)

    files = [f for f in os.listdir(folder_path) if f.endswith(extensions)]
    print(f"\n📁 {folder}/ — {len(files)} image(s) trouvée(s)")

    for filename in files:
        src_path = os.path.join(folder_path, filename)
        size_before = os.path.getsize(src_path)
        total_before += size_before

        try:
            with Image.open(src_path) as img:
                # Convertir en RGB (gère PNG avec transparence ou CMYK)
                if img.mode in ("RGBA", "P", "CMYK"):
                    img = img.convert("RGB")

                w, h = img.size

                # Redimensionner seulement si plus large que MAX_WIDTH
                if w > MAX_WIDTH:
                    ratio = MAX_WIDTH / w
                    new_size = (MAX_WIDTH, int(h * ratio))
                    img = img.resize(new_size, Image.LANCZOS)

                # Backup de l'original
                if BACKUP:
                    backup_path = os.path.join(backup_dir, filename)
                    if not os.path.exists(backup_path):
                        shutil.copy2(src_path, backup_path)

                # Sauvegarder en JPEG optimisé
                out_path = os.path.splitext(src_path)[0] + ".jpg"
                img.save(out_path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)

                # Si le fichier original était .JPG en majuscule, supprimer si différent
                if src_path != out_path and os.path.exists(src_path):
                    os.remove(src_path)

            size_after = os.path.getsize(out_path)
            total_after += size_after
            count += 1
            reduction = (1 - size_after / size_before) * 100
            print(f"  ✓ {filename:40s} {size_before/1024/1024:.1f} MB → {size_after/1024:.0f} KB  (-{reduction:.0f}%)")

        except Exception as e:
            print(f"  ✗ ERREUR {filename}: {e}")

# === RÉSUMÉ ===
print("\n" + "="*60)
print(f"✅ {count} image(s) optimisée(s)")
print(f"   Avant  : {total_before/1024/1024:.1f} MB")
print(f"   Après  : {total_after/1024/1024:.1f} MB")
if total_before > 0:
    print(f"   Gain   : {(1 - total_after/total_before)*100:.0f}% de réduction")
print(f"\nOriginaux sauvegardés dans chaque dossier/_originals/")
