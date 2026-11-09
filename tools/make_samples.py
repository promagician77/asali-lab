"""Builds messy, fictional sample contact workbooks (no real people) to exercise the segmenter.
Run: python3 tools/make_samples.py  -> samples/*.xlsx, samples/*.csv, samples/expect.json
"""
import json, random, zipfile, os
from openpyxl import Workbook
from openpyxl.cell.rich_text import CellRichText, TextBlock
from openpyxl.cell.text import InlineFont

random.seed(20261109)
OUT = os.path.join(os.path.dirname(__file__), '..', 'samples')
os.makedirs(OUT, exist_ok=True)
FIRST = ['Amara', 'Bianca', 'Carlos', 'Dana', 'Elena', 'Femi', 'Grace', 'Hana', 'Imani', 'Jasmine', 'Kofi', 'Lena', 'Marcus', 'Nia', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sade', 'Tariq', 'Uma', 'Valeria', 'Wes', 'Ximena', 'Yara', 'Zuri', 'Andre', 'Brooke', 'Chidi', 'Delia']
LAST = ['Adeyemi', 'Brooks', 'Castillo', 'Dawson', 'Ellis', 'Fofana', 'Greene', 'Haddad', 'Ibrahim', 'Jensen', 'Kowalski', 'Lindqvist', 'Mensah', 'Nakamura', 'Okafor', 'Patel', 'Quarles', 'Reyes', 'Silva', 'Thompson', 'Underwood', 'Vasquez', 'Whitaker', 'Xu', 'Young', 'Zamora']
CORP = ['northwind-labs.com', 'bluepeak-health.org', 'lakeshore-mfg.com', 'vantage-analytics.io', 'meridian-bank.com', 'cobalt-eng.com', 'harbor-logistics.net', 'summit-ins.com']
FREE = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com']
used = set()
expect = {'designed': {}}

def person(domain_pool):
    while True:
        f, l = random.choice(FIRST), random.choice(LAST)
        d = random.choice(domain_pool)
        e = f"{f}.{l}{random.randint(1, 999)}@{d}".lower()
        if e not in used:
            used.add(e)
            return f, l, e

# 1) Corporate & HR contacts: odd headers, Full Name, opt-in column, a few traps
wb = Workbook(); ws = wb.active; ws.title = 'Contacts'
ws.append(['E-mail Address', 'Full Name', 'Job Title', 'Company', 'Notes', 'Marketing Opt-In'])
titles = ['HR Director', 'VP, Engineering', 'Talent Acquisition Lead', 'Chief Financial Officer', 'Director of People Operations', 'Senior Engineer', 'Engineering Manager', 'Recruiting Manager', 'Head of Talent', 'Program Director']
corp_rows = []
for i in range(220):
    f, l, e = person(CORP if i % 4 else FREE)
    ws.append([e if i % 7 else '  ' + e.upper() + ' ', f"{f} {l}", random.choice(titles), random.choice(['Northwind Labs', 'Bluepeak Health', 'Meridian Bank', 'Cobalt Engineering']), random.choice(['', 'met at HR summit', 'leadership workshop', 'career panel']), 'No' if i % 23 == 0 else 'Yes'])
    corp_rows.append((f, l, e))
traps = [
    ('jane.doe@gmail', 'Jane Doe', 'invalid format'),
    ('n/a', 'Missing Email', 'not an email'),
    ('mark..lee@northwind-labs.com', 'Mark Lee', 'invalid dots'),
    ('sofia.reyes@gmial.com', 'Sofia Reyes', 'domain typo'),
    ('hr@meridian-bank.com', 'HR Team', 'role'),
    ('Chris Obi <chris.obi@cobalt-eng.com>', '', 'angle form'),
]
for raw, name, kind in traps:
    ws.append([raw, name, 'HR Director', 'Meridian Bank', '', 'Yes'])
expect['designed']['angle'] = 'chris.obi@cobalt-eng.com'
expect['designed']['typo'] = 'sofia.reyes@gmial.com'
expect['designed']['role'] = 'hr@meridian-bank.com'
wb.save(os.path.join(OUT, 'Corporate & HR contacts.xlsx'))

# 2) Workshops & bootcamp signups: two sheets, separate first/last, overlaps with file 1
wb = Workbook(); a = wb.active; a.title = 'PQ Bootcamp 2025'
b = wb.create_sheet('Webinars')
for sh in (a, b):
    sh.append(['First Name', 'Last Name', 'Email', 'Program', 'Subscribed'])
programs_a = ['6-Week Mental Fitness Bootcamp (PQ)', 'Positive Intelligence Bootcamp', 'Mental Fitness Bootcamp – Spring']
programs_b = ['Burnout Reset Webinar', 'Wellness & Resilience Webinar', 'Resume & LinkedIn Masterclass', 'Salary Negotiation Webinar']
for i in range(160):
    f, l, e = person(FREE)
    a.append([f, l, e, random.choice(programs_a), 'TRUE'])
for i in range(140):
    f, l, e = person(FREE + CORP)
    b.append([f, l, e, random.choice(programs_b), 'FALSE' if i % 31 == 0 else 'TRUE'])
# overlaps: 12 corporate people also took the bootcamp, 1 of them unsubscribed here
for k, (f, l, e) in enumerate(corp_rows[1:13]):
    a.append([f, l, e.upper(), programs_a[0], 'FALSE' if k == 0 else 'TRUE'])
expect['designed']['unsub_overlap'] = corp_rows[1][2]
wb.save(os.path.join(OUT, 'Workshops & bootcamp signups.xlsx'))

# 3) Dance students: header on row 3 under a title, rich-text cells, "Unsubscribed" (inverted) column
wb = Workbook(); ws = wb.active; ws.title = 'Students'
ws.append(['Fiercely Feminine & dance roster'])
ws.append(['exported from studio app'])
ws.append(['Name', 'Email Address', 'Class', 'Unsubscribed'])
classes = ['Belly Dance Level 1', 'Fiercely Feminine Workshop', 'MENAHT Masterclass', 'Hafla RSVP', 'Stage Presence for Performers']
for i in range(180):
    f, l, e = person(FREE)
    cls = random.choice(classes)
    name = CellRichText([TextBlock(InlineFont(b=True), f), ' ' + l]) if i % 10 == 0 else f"{l}, {f}" if i % 9 == 0 else f"{f} {l}"
    ws.append([name, e, cls, 'yes' if i % 29 == 0 else ''])
wb.save(os.path.join(OUT, 'Dance students.xlsx'))

# 4) Explicit vertical column + no-signal leads
wb = Workbook(); ws = wb.active; ws.title = 'Leads'
ws.append(['email', 'first', 'last', 'Vertical', 'Source'])
for i in range(60):
    f, l, e = person(FREE)
    ws.append([e, f, l, ['Work', 'Live', 'Play', ''][i % 4], 'Instagram' if i % 2 else 'Referral'])
ws.append(['both.sides@gmail.com', 'Both', 'Sides', 'Work, Play', 'Referral'])
expect['designed']['multi_vertical'] = 'both.sides@gmail.com'
wb.save(os.path.join(OUT, 'Misc leads.xlsx'))

# 5) Old newsletter export: semicolons, BOM, quoted comma, CRLF
rows = ['"Email";"Name";"Status"']
for i in range(90):
    f, l, e = person(FREE + CORP)
    rows.append(f'"{e}";"{l}, {f}";"{"unsubscribed" if i % 17 == 0 else "subscribed"}"')
with open(os.path.join(OUT, 'Old newsletter export.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
    fh.write('\r\n'.join(rows) + '\r\n')

# 6) Hand-built xlsx with inline strings (what some exporters write instead of shared strings)
inline = os.path.join(OUT, 'Inline strings (exporter).xlsx')
sheet = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
         '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
         '<row r="1"><c r="A1" t="inlineStr"><is><t>Email</t></is></c><c r="C1" t="inlineStr"><is><t>Interest</t></is></c></row>'
         '<row r="2"><c r="A2" t="inlineStr"><is><t>inline.one@gmail.com</t></is></c><c r="C2" t="inlineStr"><is><r><t>Belly </t></r><r><t>Dance</t></r></is></c></row>'
         '<row r="3"><c r="A3" t="inlineStr"><is><t>inline.two&amp;co@gmail.com</t></is></c><c r="C3" t="inlineStr"><is><t>HR &amp; Talent</t></is></c></row>'
         '</sheetData></worksheet>')
with zipfile.ZipFile(inline, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
    z.writestr('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    z.writestr('xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Export" sheetId="1" r:id="rId1"/></sheets></workbook>')
    z.writestr('xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
    z.writestr('xl/worksheets/sheet1.xml', sheet)

json.dump(expect, open(os.path.join(OUT, 'expect.json'), 'w'), indent=1)
print('unique generated addresses:', len(used))
