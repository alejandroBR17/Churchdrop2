import test from 'node:test';import assert from 'node:assert/strict';
import {duplicateWarnings,interruptedOutcome} from '../services/uploadReview.ts';
test('duplicates warn on normalized names and sizes without treating metadata as proof',()=>{
 const files=[{name:'Foto.jpg',size:20},{name:'FOTO.JPG',size:20},{name:'Aviso.pdf',size:50},{name:'Novo.mp4',size:100}];
 const warnings=duplicateWarnings(files,[{name:'aviso.pdf',sizeBytes:50},{name:'outro.jpg',sizeBytes:20}]);
 assert.equal(warnings.get(0),'selection');assert.equal(warnings.get(1),'selection');assert.equal(warnings.get(2),'library-exact');assert.equal(warnings.has(3),false);
 assert.equal(files.length,4);
});
test('compressed photos and composed accents still warn by name; sizes alone never warn',()=>{
 const warnings=duplicateWarnings([{name:'  Reunia\u0303o.jpg ',size:900},{name:'diferente.jpg',size:200}], [{name:'Reunião.jpg',sizeBytes:200}]);
 assert.equal(warnings.get(0),'library-name');assert.equal(warnings.has(1),false);
});
test('interrupted publication is distinct from interrupted transfer and untouched queue',()=>{
 assert.equal(interruptedOutcome('publishing',true),'publication-pending');assert.equal(interruptedOutcome('complete',false),'publication-pending');
 assert.equal(interruptedOutcome('transferring',true),'paused');assert.equal(interruptedOutcome('opening',false),'failed');
});
