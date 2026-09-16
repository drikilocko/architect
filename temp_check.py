import re

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read()

paths = re.findall(r"file_path: .*?(assets/.*?|projet/.*?|produit/.*?)(?:\'|\")", content)
print('Paths found:', len(paths))
for p in paths:
    print(p)
