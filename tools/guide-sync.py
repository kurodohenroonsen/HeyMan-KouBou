#!/usr/bin/env python3
"""Met à jour les extraits réels des chapitres écrits en modèle (tools/guide-tpl/*.md.tpl) : <<fichier>> ou <<fichier|code1,code2>> → lignes de docs/guide/journaux/<fichier>.log.
   python3 tools/guide-sync.py tools/guide-tpl/*.tpl"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'docs' / 'guide'
NOISE = re.compile(r'^(store|canvas|storage|version|edit|perf)\.|^ui\.dialog\.')
LINE = re.compile(r'^\S+ \+\S+ (\S+)\s+(\S+)')
MAX = 300

def cut(s):
    return s if len(s) <= MAX else s[:MAX - 1] + '…'

def block(spec):
    name, _, codes = spec.partition('|')
    lines = (ROOT / 'journaux' / f'{name}.log').read_text(encoding='utf-8').splitlines()
    want = [c.strip() for c in codes.split(',') if c.strip()]
    out, last = [], None
    for i, l in enumerate(lines):
        m = LINE.match(l)
        code = m.group(2) if m else ''
        keep = (code in want) if want else not NOISE.match(code)
        if not keep:
            continue
        if last is not None and i != last + 1 and want:
            out.append('…')
        out.append(cut(l))
        last = i
    if not out:
        sys.exit(f'aucune ligne pour {spec}')
    return '\n'.join(out)

for tpl in sys.argv[1:]:
    p = pathlib.Path(tpl)
    text = p.read_text(encoding='utf-8')
    text = re.sub(r'<<([a-z0-9-]+(?:\|[^>]*)?)>>', lambda m: block(m.group(1)), text)
    (ROOT / p.name.replace('.tpl', '')).write_text(text, encoding='utf-8')
    print('écrit', p.name.replace('.tpl', ''))
