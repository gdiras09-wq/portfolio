"""Build the downloadable CV from cv.txt. Requires reportlab; pymupdf renders QA."""
from pathlib import Path
import re
import sys
from xml.sax.saxutils import escape
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tmp/pdf-deps'))
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether, HRFlowable

out = ROOT / 'output/pdf/Gerald-Diras-CV.pdf'
out.parent.mkdir(parents=True, exist_ok=True)
navy = colors.HexColor('#17233b')
accent = colors.HexColor('#5843a8')
base = ParagraphStyle('body', fontName='Helvetica', fontSize=10, leading=14, textColor=navy, spaceAfter=6)
section = ParagraphStyle('section', parent=base, fontName='Helvetica-Bold', fontSize=10, textColor=accent, spaceBefore=14, spaceAfter=8)
name = ParagraphStyle('name', parent=base, fontName='Helvetica-Bold', fontSize=27, leading=32, spaceAfter=5)
role = ParagraphStyle('role', parent=base, fontSize=12, leading=17, spaceAfter=8)
sub = ParagraphStyle('sub', parent=base, fontName='Helvetica-Bold', fontSize=10, leading=14, spaceAfter=6)
bullet = ParagraphStyle('bullet', parent=base, leftIndent=10, firstLineIndent=-7, spaceAfter=5)
small = ParagraphStyle('small', parent=base, fontSize=9, leading=13)
source = (ROOT / 'cv.txt').read_text(encoding='utf-8').strip()
blocks = source.split('\n\n')
header = blocks.pop(0).splitlines()
story = [Paragraph(escape(header[0]), name), Paragraph(escape(header[1]), role)]
for line in header[2:]:
    label, value = line.split(': ', 1)
    target = 'mailto:' + value if label == 'Email' else value
    story.append(Paragraph(f'{escape(label)}: <link href="{escape(target)}" color="#5843a8">{escape(value)}</link>', small))
story += [Spacer(1, 10), HRFlowable(width='100%', thickness=1, color=accent)]
headings = {'PROFILE', 'EDUCATION', 'SELECTED PROJECTS', 'TECHNOLOGIES'}
for block in blocks:
    lines = block.splitlines()
    if lines[0] in headings:
        story.append(Paragraph(lines.pop(0), section))
    if not lines:
        continue
    if lines[0].startswith(('SmartQR Ordering |', 'Autonomous Trash Can Companion |')):
        title = Paragraph(escape(lines.pop(0)), sub)
        items = re.split(r'\n- ', '\n'.join(lines).removeprefix('- '))
        paragraphs = []
        for item in items:
            text = ' '.join(item.split())
            if text.startswith('Source: '):
                url = text[8:]
                paragraphs.append(Paragraph(f'Source: <link href="{escape(url)}" color="#5843a8">{escape(url)}</link>', small))
            else:
                paragraphs.append(Paragraph('- ' + escape(text), bullet))
        story.append(KeepTogether([title] + paragraphs))
        story.append(Spacer(1, 8))
    elif lines[0] == 'Tanauan City College':
        story += [Paragraph('Tanauan City College', sub), Paragraph(escape(' '.join(lines[1:])), base)]
    else:
        story.append(Paragraph(escape(' '.join(lines)), base))
doc = SimpleDocTemplate(str(out), pagesize=A4, rightMargin=48, leftMargin=48, topMargin=43, bottomMargin=43, title='Gerald Diras - CV', author='Gerald Diras')
doc.build(story)
import fitz
pdf = fitz.open(out)
assert len(pdf) == 1, f'CV should be one page, got {len(pdf)}'
text = ''.join(page.get_text() for page in pdf)
for value in ['gdiras09@gmail.com', 'Tanauan City College', '2027', 'Sole developer', 'classmate']:
    assert value in text, f'Missing CV content: {value}'
qa = ROOT / 'tmp/pdfs'
qa.mkdir(parents=True, exist_ok=True)
pdf[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(qa / 'cv-preview.png')
print(f'Generated and checked one-page CV: {out}')
print(f'Preview: {qa / "cv-preview.png"}')
