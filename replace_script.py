import os

directory = r'c:\Users\WIN-10\Personal Budget Planner'
search_text = 'HR Fund Manager'
replace_text = 'Fund Manager'

for root, dirs, files in os.walk(directory):
    if '.git' in root or 'icons' in root:
        continue
    for file in files:
        if file.endswith(('.js', '.html', '.css', '.json', '.md')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                if search_text in content:
                    content = content.replace(search_text, replace_text)
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f'Updated {filepath}')
            except Exception as e:
                print(f'Error on {filepath}: {e}')
