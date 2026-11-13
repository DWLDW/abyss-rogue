# bundle.py — 게임을 단일 HTML 파일로 번들 (dist/abyss-rogue.html)
import re, base64, pathlib

root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text(encoding='utf-8')

css = (root / 'css/style.css').read_text(encoding='utf-8')
png = base64.b64encode((root / 'assets/title.png').read_bytes()).decode()
css = css.replace("url('../assets/title.png')", "url('data:image/png;base64," + png + "')")
html = re.sub(r'<link rel="stylesheet" href="css/style\.css\?v=\d+">',
              lambda m: '<style>\n' + css + '\n</style>', html)

def repl(m):
    src = m.group(1).split('?')[0]
    js = (root / src).read_text(encoding='utf-8')
    assert '</script' not in js.lower(), src
    return '<script>\n' + js + '\n</script>'

matches = re.findall(r'<script src="(js/[^"]+)"></script>', html)
print('MATCHES:', matches)
html = re.sub(r'<script src="(js/[^"]+)"></script>', repl, html)
out = root / 'dist' / 'abyss-rogue.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print('WROTE', out, len(html) // 1024, 'KB')
