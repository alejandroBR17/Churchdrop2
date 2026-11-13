import test from 'node:test';
import assert from 'node:assert/strict';
import {rangeSelection} from '../services/rangeSelection.ts';
const order=['a','b','c','d','e'];
test('shift selects both endpoints and all visible items between them while keeping other picks',()=>{
 const selected=['a','e'];assert.deepEqual(rangeSelection(selected,order,'a','d',true),['a','e','b','c','d']);assert.deepEqual(selected,['a','e']);
});
test('reverse ranges use displayed order rather than sorting IDs',()=>{
 const visible=['z','b','y','a'];assert.deepEqual(rangeSelection(['a'],visible,'a','b',true),['a','b','y']);
});
test('missing or hidden anchors fall back to toggling only the clicked item',()=>{
 assert.deepEqual(rangeSelection([],order,null,'c',true),['c']);assert.deepEqual(rangeSelection(['a'],['c','d'],'a','d',true),['a','d']);assert.deepEqual(rangeSelection(['c'],order,null,'c',true),[]);
});
test('hidden or not yet rendered files are excluded from the range',()=>{
 assert.deepEqual(rangeSelection(['a'],['a','c','e'],'a','e',true),['a','c','e']);assert.deepEqual(rangeSelection(['a'],order,'a','hidden',true),['a']);
});
test('ordinary clicks toggle one item and a marked Shift target deselects the interval',()=>{
 assert.deepEqual(rangeSelection(['a','b','c'],order,'a','b',false),['a','c']);const selected=rangeSelection(['b'],order,'b','e',true);assert.deepEqual(rangeSelection(selected,order,'b','e',true),[]);
});


test('Shift deselection works in both directions and keeps choices outside the visible range',()=>{
 const selected=['outside','a','b','c','d','e'];
 for(const [anchor,target] of [['b','d'],['d','b']])assert.deepEqual(rangeSelection(selected,order,anchor,target,true),['outside','a','e']);
 assert.deepEqual(rangeSelection(['a','hidden','e'],['a','c','e'],'a','e',true),['hidden']);
 assert.deepEqual(selected,['outside','a','b','c','d','e']);
});
