/* xlsx-lite: reads the cell text of every sheet in an .xlsx file. No upload, no eval, no
   formulas executed; only the cached values Excel saved. ~150 lines on top of fflate (unzip).
   Works in the browser (window.XlsxLite) and in Node (require). */
(function (root) {
  var fflate = root.fflate || (typeof require !== 'undefined' ? require('fflate') : null);

  function decodeXml(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, function (m, e) {
      var k = e.toLowerCase();
      if (k === 'lt') return '<'; if (k === 'gt') return '>'; if (k === 'amp') return '&';
      if (k === 'quot') return '"'; if (k === 'apos') return "'";
      var n = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    });
  }
  function text(bytes) { return new TextDecoder('utf-8').decode(bytes); }
  // All <t>…</t> runs inside an element (handles rich text and phonetic runs are skipped).
  function runs(xml) {
    var out = '', re = /<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>|<(?:\w+:)?t(?:\s[^>]*)?\/>/g, m;
    xml = xml.replace(/<(?:\w+:)?rPh[\s\S]*?<\/(?:\w+:)?rPh>/g, '');
    while ((m = re.exec(xml))) out += m[1] ? decodeXml(m[1]) : '';
    return out;
  }
  function colIndex(ref) {
    var letters = /^[A-Z]+/.exec(ref)[0], n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n - 1;
  }
  function resolve(base, target) {
    if (target[0] === '/') return target.slice(1);
    var parts = base.split('/'); parts.pop();
    target.split('/').forEach(function (p) { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); });
    return parts.join('/');
  }

  /** @returns {{sheets: {name:string, rows:string[][]}[]}} */
  function read(buffer) {
    var u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (u8[0] !== 0x50 || u8[1] !== 0x4b) throw new Error('Not an .xlsx file (old .xls files must be re-saved as .xlsx or .csv)');
    var files = fflate.unzipSync(u8, { filter: function (f) { return /\.(xml|rels)$/.test(f.name) && f.originalSize < 200e6; } });
    var get = function (p) { return files[p] ? text(files[p]) : null; };
    var wb = get('xl/workbook.xml');
    if (!wb) throw new Error('No workbook inside this file');
    var rels = get('xl/_rels/workbook.xml.rels') || '', relMap = {}, m;
    var relRe = /<Relationship\b([^>]*)\/?>/g;
    while ((m = relRe.exec(rels))) {
      var id = /\bId="([^"]+)"/.exec(m[1]), tg = /\bTarget="([^"]+)"/.exec(m[1]);
      if (id && tg) relMap[id[1]] = resolve('xl/workbook.xml', decodeXml(tg[1]));
    }
    var shared = [], sst = get('xl/sharedStrings.xml');
    if (sst) { var siRe = /<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>|<(?:\w+:)?si\/>/g; while ((m = siRe.exec(sst))) shared.push(m[1] ? runs(m[1]) : ''); }
    var sheets = [], shRe = /<(?:\w+:)?sheet\b([^>]*)\/?>/g;
    while ((m = shRe.exec(wb))) {
      var nm = /\bname="([^"]*)"/.exec(m[1]), rid = /\br:id="([^"]+)"/.exec(m[1]) || /\bid="([^"]+)"/.exec(m[1]);
      var path = rid && relMap[rid[1]], xml = path && get(path);
      if (!xml) continue;
      sheets.push({ name: decodeXml(nm ? nm[1] : 'Sheet'), rows: parseSheet(xml, shared) });
    }
    return { sheets: sheets };
  }

  function parseSheet(xml, shared) {
    var rows = [], rowRe = /<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g, r;
    var cellRe = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g;
    var rowNum = 0;
    while ((r = rowRe.exec(xml))) {
      var rattr = /\br="(\d+)"/.exec(r[0].slice(0, 200));
      rowNum = rattr ? +rattr[1] : rowNum + 1;
      var row = [], c, nextCol = 0;
      cellRe.lastIndex = 0;
      var body = r[1] || '';
      while ((c = cellRe.exec(body))) {
        var a = c[1], inner = c[2] || '';
        var ref = /\br="([A-Z]+)\d+"/.exec(a), t = /\bt="(\w+)"/.exec(a);
        var col = ref ? colIndex(ref[1]) : nextCol;
        nextCol = col + 1;
        var type = t ? t[1] : 'n', v = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner), val = '';
        if (type === 's') val = v ? (shared[+v[1]] || '') : '';
        else if (type === 'inlineStr') val = runs(/<(?:\w+:)?is>([\s\S]*?)<\/(?:\w+:)?is>/.exec(inner) ? /<(?:\w+:)?is>([\s\S]*?)<\/(?:\w+:)?is>/.exec(inner)[1] : '');
        else if (type === 'b') val = v ? (v[1] === '1' ? 'TRUE' : 'FALSE') : '';
        else val = v ? decodeXml(v[1]) : '';
        row[col] = val;
      }
      for (var i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = '';
      rows[rowNum - 1] = row;
    }
    for (var j = 0; j < rows.length; j++) if (!rows[j]) rows[j] = [];
    return rows;
  }

  /** RFC 4180 CSV (also ; and tab separated, BOM stripped). */
  function readCsv(str) {
    str = str.replace(/^﻿/, '');
    var first = str.split(/\r?\n/, 1)[0] || '';
    var counts = { ',': (first.match(/,/g) || []).length, ';': (first.match(/;/g) || []).length, '\t': (first.match(/\t/g) || []).length };
    var sep = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (q) {
        if (ch === '"') { if (str[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"' && cell === '') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && str[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return { sheets: [{ name: 'CSV', rows: rows }], separator: sep === '\t' ? 'tab' : sep };
  }

  var api = { read: read, readCsv: readCsv };
  root.XlsxLite = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
