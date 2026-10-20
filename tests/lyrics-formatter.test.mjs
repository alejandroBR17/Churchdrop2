import test from 'node:test';
import assert from 'node:assert/strict';
import {formatLyrics} from '../services/lyricsFormatter.ts';

test('emoji graphemes, keycaps, invisible characters and markdown are cleaned without damaging text or numbers',()=>{
 const result=formatLyrics('**Canção 123** 👩🏽‍🎤 🇧🇷 1️⃣\r\n\u200bA paz — não se vai! 🎼\r\nÉ fé… e amor.',{linesPerSlide:0});
 assert.equal(result.text,'CANÇÃO 123\n\nA paz — não se vai!\nÉ fé… e amor.');
 assert.ok(result.changes.length>=2);
 assert.ok(!/[\u200d\ufe0f]/u.test(result.text));
});
test('unknown parentheticals are preserved and reviewed, never assumed to be author names',()=>{
 const result=formatLyrics('Título\n(Eu creio em Ti)\n(Fernando Rodrigues)\nSó em Ti confio');
 assert.ok(result.text.includes('(Eu creio em Ti)'));
 assert.ok(result.text.includes('(Fernando Rodrigues)'));
 assert.equal(result.review.length,2);
 assert.ok(result.text.includes('Só em Ti confio'));
});
test('only explicit metadata, complete section markers, timestamps and repeat suffixes are removed',()=>{
 const result=formatLyrics('Título\nAutor: Nome Exemplo\n[Refrão] 2x\n[00:12.50]Eu cantarei (2×)\nSolo em Ti confio\n\nVerso 2\nA paz está aqui\nhttps://example.test/credits');
 assert.equal(result.text,'TÍTULO\n\nEu cantarei\nSolo em Ti confio\n\nA paz está aqui');
 assert.ok(result.changes.some(row=>row.reason.includes('Crédito')));
});
test('chord-only lines can be removed, but lyric words and accented text remain',()=>{
 const input='Título\nC G/B Am F#m7\nAmém, meu Rei\nA paz não se foi';
 const result=formatLyrics(input);
 assert.ok(!result.text.includes('G/B'));
 assert.ok(result.text.includes('Amém, meu Rei'));
 assert.ok(result.text.includes('A paz não se foi'));
 assert.ok(formatLyrics(input,{removeChords:false}).text.includes('C G/B Am F#m7'));
});
test('slide grouping respects stanza boundaries and optional title without deduplicating sung repetitions',()=>{
 const result=formatLyrics('Linha um\nLinha dois\nLinha três\n\nOutra estrofe\nOutra estrofe',{firstLineIsTitle:false,linesPerSlide:2});
 assert.equal(result.text,'Linha um\nLinha dois\n\nLinha três\n\nOutra estrofe\nOutra estrofe');
 assert.equal(result.slides,3);
 assert.equal(formatLyrics('primeira\nsegunda',{firstLineIsTitle:false,uppercaseTitle:true}).text,'primeira\nsegunda');
});
test('line overrides restore removed material or explicitly remove ambiguous content without changing the original source',()=>{
 const input='Título\nAutor: Nome Exemplo\n(Conteúdo duvidoso)';
 const result=formatLyrics(input,{overrides:{2:'keep',3:'remove'}});
 assert.ok(result.text.includes('Autor: Nome Exemplo'));
 assert.ok(!result.text.includes('Conteúdo duvidoso'));
 assert.equal(result.changes.find(row=>row.line===2).kept,true);
 assert.equal(result.changes.find(row=>row.line===3).reason,'Remoção manual');
 assert.equal(input,'Título\nAutor: Nome Exemplo\n(Conteúdo duvidoso)');
});
test('disabled cleanup options preserve markers and metadata; oversized input is refused explicitly',()=>{
 const result=formatLyrics('Título\nAutor: Exemplo\n[Refrão]\n🎤 Palavra',{removeSymbols:false,removeCredits:false,removeSections:false});
 assert.ok(result.text.includes('Autor: Exemplo'));
 assert.ok(result.text.includes('[Refrão]'));
 assert.ok(result.text.includes('🎤 Palavra'));
 const large=formatLyrics('a'.repeat(100001));assert.ok(large.error);assert.equal(large.text,'');
});


test('styled alphabet and decorative arrows are normalized while ordinary punctuation remains',()=>{
 const result=formatLyrics('𝓐𝓶𝓸𝓻 ➤\n✞ Eu creio!\nA paz — permanece…');
 assert.equal(result.text,'AMOR\n\nEu creio!\nA paz — permanece…');
});

test('long non-chord tokens and excessive spaces are preserved without expensive chord matching',()=>{
 const token='1'.repeat(3000)+'X';
 const result=formatLyrics('Título\nC '+token+'\nA'+' '.repeat(3000)+'paz');
 assert.ok(result.text.includes('C '+token));
 assert.ok(result.text.includes('A paz'));
});
