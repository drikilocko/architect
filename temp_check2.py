import re, os

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read()

paths = re.findall(r"file_path: .*?(assets/.*?|projet/.*?|produit/.*?)(?:\'|\")", content)
print('Total paths:', len(paths))
missing = []
for p in paths:
    if not os.path.exists(p):
        missing.append(p)
print('Missing:', len(missing))
for p in missing:
    print(p)
