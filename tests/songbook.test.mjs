import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSongs} from '../services/songbook.ts';
import {libraryDays,uploadDay} from '../services/libraryDays.ts';

const example=`🔴 Nada Mais
( Fernando Rodrigues )

Envolto em Tua presença
Quero me sentar aqui aos Teus pés
( Trecho )
Perdoa
quando fiz tudo no automático

🔴 ESCAPE
André Barroso
━━━━━━━━━━━━━━
O inimigo tenta laços e embaraços
► TRECHO
Aquele que acalma o vento
▶️ REFRÃO 2X

🟣 BENDITO SERÁS
André Barroso
━━━━━━━━━━━━━━
Não, este não pode ser seu fim
► REFRÃO 2X
Bendita será sua casa
▶️ TRECHO

🔴 EU CUIDO DE TI 🎹🥁
Fernando Rodrigues
━━━━━━━━━━━━━━
Quando todos os meus medos
▶️ REFRÃO
Eu cuido de Ti
Eu cuido de Ti
► REFRÃO 2X`;

test('the supplied song formats become four titles and clean lyrics, preserving sung repetition',()=>{
 const {songs}=prepareSongs(example);
 assert.deepEqual(songs.map(song=>song.title),['Nada Mais','ESCAPE','BENDITO SERÁS','EU CUIDO DE TI']);
 for(const song of songs){assert.ok(song.lyrics);assert.ok(!/Rodrigues|Barroso|━|TRECHO|REFRÃO|2X|🔴|🟣|🎹|🥁|►|▶/u.test(song.lyrics));}
 assert.equal(songs[3].lyrics,'Quando todos os meus medos\n\nEu cuido de Ti\nEu cuido de Ti');
 assert.ok(songs[0].lyrics.includes('Perdoa\nquando fiz tudo no automático'));
});

test('author detection is restricted to the title position and can be undone per original line',()=>{
 const input='Canção\nAndré Barroso\n\nUm verso\nAndré Barroso\n\n🔵 Outra canção\nFernando Rodrigues\n\nOutro verso';
 const result=prepareSongs(input,{overrides:{2:'keep',8:'keep'}});
 assert.equal(result.songs.length,2);
 assert.ok(result.songs[0].lyrics.startsWith('André Barroso'));
 assert.ok(result.songs[1].lyrics.startsWith('Fernando Rodrigues'));
 const normal=prepareSongs(input);
 assert.ok(normal.songs[0].lyrics.includes('Um verso\nAndré Barroso'));
 assert.equal(normal.songs[1].lyrics,'Outro verso');
});

test('plain lyrics, devotional phrases, punctuation and unknown parentheticals remain',()=>{
 const result=prepareSongs('Nome da canção\nEspírito Santo\nEu creio em Ti\n(Em Ti confio)\nNão, eu não desisto!');
 assert.ok(result.songs[0].lyrics.startsWith('Espírito Santo'));
 assert.ok(result.songs[0].lyrics.includes('(Em Ti confio)'));
 assert.ok(result.songs[0].lyrics.includes('Não, eu não desisto!'));
 assert.equal(result.songs[0].review.length,1);
 assert.equal(prepareSongs('Música: Minha canção\nAutor: Nome Exemplo\n\nCantarei').songs[0].title,'Minha canção');
 assert.ok(prepareSongs('x'.repeat(100001)).error);
});

test('cleanup options preserve credits when requested and section labels do not create fake songs',()=>{
 const result=prepareSongs('🔴 Canção\nAndré Barroso\n\nUm verso\n🔴 REFRÃO 2X\nOutro verso',{removeCredits:false});
 assert.equal(result.songs.length,1);assert.ok(result.songs[0].lyrics.includes('André Barroso'));
 assert.ok(!result.songs[0].lyrics.includes('REFRÃO'));
});

test('library dates use Brasília midnight and selection dates include different events from the same day',()=>{
 const items=[['a','2026-10-18T02:59:59Z','A'],['b','2026-10-18T03:00:00Z','B'],['c','2026-10-18T17:00:00Z','C']].map(([id,date,eventName])=>({id,date:new Date(date),eventName}));
 assert.equal(uploadDay(items[0].date),'2026-10-17');assert.equal(uploadDay(items[1].date),'2026-10-18');
 assert.deepEqual(libraryDays(items),[{key:'2026-10-18',label:'18/10/2026',count:2},{key:'2026-10-17',label:'17/10/2026',count:1}]);
 assert.deepEqual(items.filter(item=>uploadDay(item.date)==='2026-10-18').map(item=>item.id),['b','c']);
});

test('plain hymn and keyboard-player collection split correctly and remove playing instructions',()=>{
 const input='Quão Grande És Tu\n\nSenhor, meu Deus\nQuando eu, maravilhado\n— Refrão\nEntão minh\'alma canta a Ti, Senhor\n— Canta o refrão\nTrecho\nE quando enfim, Jesus vier em glória\n Canta o refrão\n\nMúsicas Tecladista I 🎹:\nGuarda a Minha Casa 🎵\nPr Iran Santos\n\nMeu Deus como eu preciso\nDo Senhor\n[Trecho]\nMal nenhum me sucederá\n[Refrão]\nGuarda a minha casa meu Pai\n↑ ( Trecho ) ↑\nRefrão\nRefrão Bateria';
 const {songs}=prepareSongs(input);
 assert.deepEqual(songs.map(song=>song.title),['Quão Grande És Tu','Guarda a Minha Casa']);
 assert.ok(songs[0].lyrics.startsWith('Senhor, meu Deus\nQuando eu, maravilhado'));
 assert.ok(songs[0].lyrics.includes('Então minh\'alma canta a Ti, Senhor'));
 assert.ok(songs[1].lyrics.includes('Meu Deus como eu preciso\nDo Senhor'));
 for(const song of songs)assert.ok(!/refrão|trecho|bateria|tecladista|Iran|Santos|↑|🎹|🎵/iu.test(song.lyrics));
});

test('instruction recognition does not strip ordinary lyric lines containing music words',()=>{
 const {songs}=prepareSongs('Canção\n\nEu canto o refrão da esperança\nMeu coração é um teclado de amor\nO som da bateria anuncia alegria');
 assert.ok(songs[0].lyrics.includes('Eu canto o refrão da esperança'));
 assert.ok(songs[0].lyrics.includes('O som da bateria anuncia alegria'));
});
