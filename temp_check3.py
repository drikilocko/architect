import re

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read()

print('Has window.projectData:', 'window.projectData' in content)
print('Has window.projectList:', 'window.projectList' in content)

# Count project IDs in projectData
ids = re.findall(r'^\s+(\d+):\s*\{', content, re.MULTILINE)
print('projectData IDs:', ids)
