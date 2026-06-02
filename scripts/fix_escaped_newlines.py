import glob, os, io
root='src/features'
files=glob.glob(os.path.join(root, '**', '*.tsx'), recursive=True)
count=0
for f in files:
    with io.open(f, 'r', encoding='utf-8') as fh:
        s=fh.read()
    orig=s
    if '\\n\\nimport React' in s:
        s=s.replace('\\n\\nimport React', 'import React')
    # Also remove duplicated import React lines, keeping first
    parts=s.split('\n')
    first_import_idx=None
    for i,line in enumerate(parts):
        if line.strip().startswith("import React"):
            if first_import_idx is None:
                first_import_idx=i
            else:
                parts[i]=''
    new='\n'.join(parts)
    if new!=orig:
        with io.open(f, 'w', encoding='utf-8') as fh:
            fh.write(new)
        count+=1
print('Fixed', count, 'files')
