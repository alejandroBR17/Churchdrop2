import test from 'node:test';
import assert from 'node:assert/strict';
import {imageLayout,imagePreviewUrl} from '../services/imagePreview.ts';

test('small images grow to fit the viewer while keeping their aspect ratio',()=>{
 const value=imageLayout(160,90,1000,600);
 assert.equal(value.width,1000);assert.equal(value.height,562.5);
 assert.equal(value.canvasWidth,1000);assert.equal(value.canvasHeight,600);
});
test('portrait images fit within mobile height and zoom creates scrollable space',()=>{
 const fit=imageLayout(600,1200,374,650);
 assert.equal(fit.width,325);assert.equal(fit.height,650);
 const zoom=imageLayout(600,1200,374,650,0,2);
 assert.equal(zoom.width,650);assert.equal(zoom.height,1300);
 assert.equal(zoom.canvasWidth,650);assert.equal(zoom.canvasHeight,1300);
});
test('quarter-turn rotation fits the rotated bounds, including after zoom',()=>{
 const value=imageLayout(600,1200,1000,600,90);
 assert.equal(value.width,500);assert.equal(value.height,1000);
 assert.equal(value.canvasWidth,1000);assert.equal(value.canvasHeight,600);
 const zoom=imageLayout(600,1200,1000,600,270,2);
 assert.equal(zoom.canvasWidth,2000);assert.equal(zoom.canvasHeight,1000);
});
test('unmeasured image and viewport sizes never produce invalid CSS dimensions',()=>{
 for(const values of [[0,10,10,10],[10,0,10,10],[10,10,0,10],[10,10,10,NaN],[10,10,10,10,0,0]])assert.equal(imageLayout(...values),null);
});
test('only known Google thumbnail suffixes are enlarged; other sources and query parameters are preserved',()=>{
 assert.equal(imagePreviewUrl('https://lh3.googleusercontent.com/d/file=s220'),'https://lh3.googleusercontent.com/d/file=s2048');
 assert.equal(imagePreviewUrl('https://lh3.googleusercontent.com/drive-storage/file=w220-h200-p-k?example=1'),'https://lh3.googleusercontent.com/drive-storage/file=s2048?example=1');
 for(const source of ['https://images.example/photo=s220','https://googleusercontent.com.evil.example/photo=s220','blob:https://example.test/local','https://lh3.googleusercontent.com/no-sizing','http://lh3.googleusercontent.com/photo=s220'])assert.equal(imagePreviewUrl(source),source);
});
