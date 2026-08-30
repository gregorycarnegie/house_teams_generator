"""Regenerate the workbook fixtures used by common/src/spreadsheet.rs tests.

Run from the repo root: python common/fixtures/mkxlsx.py

Writes minimal OOXML and ODF by hand, so it needs nothing but the stdlib (no
openpyxl, no odfpy). Edit the row tables at the foot of the file, not the
workbooks.
"""
import pathlib
import zipfile

CT = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>'''

RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''

WB = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Students" sheetId="1" r:id="rId1"/></sheets>
</workbook>'''

WBRELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>'''

def col(i):
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s

def sheet(rows):
    out = []
    for r, cells in enumerate(rows, start=1):
        cs = "".join(
            f'<c r="{col(c)}{r}" t="inlineStr"><is><t xml:space="preserve">{v}</t></is></c>'
            for c, v in enumerate(cells) if v is not None)
        out.append(f'<row r="{r}">{cs}</row>')
    width = col(max(len(r) for r in rows) - 1)
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            f'<dimension ref="A1:{width}{len(rows)}"/><sheetData>{"".join(out)}</sheetData></worksheet>')

def write(path, rows):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CT)
        z.writestr("_rels/.rels", RELS)
        z.writestr("xl/workbook.xml", WB)
        z.writestr("xl/_rels/workbook.xml.rels", WBRELS)
        z.writestr("xl/worksheets/sheet1.xml", sheet(rows))
    print("wrote", path)

out = pathlib.Path("common/fixtures")
out.mkdir(parents=True, exist_ok=True)

# Headers need trimming; row 3 is blank; row 4 stops short of the header width.
write(out / "students.xlsx", [
    [" Name ", "Year", " Class "],
    ["Alice", "7", "7A"],
    ["", "", ""],
    ["Bob", None, None],
])

# Header cells hold only whitespace: non-empty to the sheet, blank once trimmed.
write(out / "blank_headers.xlsx", [
    [" ", "  "],
    ["Alice", "7"],
])


# --- ODS ---------------------------------------------------------------------
ODS_MIME = "application/vnd.oasis.opendocument.spreadsheet"

ODS_MANIFEST = f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
<manifest:file-entry manifest:full-path="/" manifest:media-type="{ODS_MIME}"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>"""


def ods_content(rows):
    body = []
    for cells in rows:
        cs = []
        for v in cells:
            if v is None:
                cs.append("<table:table-cell/>")
            else:
                cs.append(
                    '<table:table-cell office:value-type="string">'
                    f"<text:p>{v}</text:p></table:table-cell>")
        body.append(f"<table:table-row>{''.join(cs)}</table:table-row>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<office:document-content '
            'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
            'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
            'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" '
            'office:version="1.2"><office:body><office:spreadsheet>'
            '<table:table table:name="Students">'
            f"{''.join(body)}"
            "</table:table></office:spreadsheet></office:body></office:document-content>")


def write_ods(path, rows):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        # The mimetype entry must come first and be stored uncompressed.
        z.writestr(zipfile.ZipInfo("mimetype"), ODS_MIME, zipfile.ZIP_STORED)
        z.writestr("META-INF/manifest.xml", ODS_MANIFEST)
        z.writestr("content.xml", ods_content(rows))
    print("wrote", path)


# Same shape as students.xlsx, so one set of assertions covers both formats.
write_ods(out / "students.ods", [
    [" Name ", "Year", " Class "],
    ["Alice", "7", "7A"],
    ["", "", ""],
    ["Bob", None, None],
])
