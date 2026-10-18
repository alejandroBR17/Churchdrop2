import test from 'node:test';import assert from 'node:assert/strict';
import {browserDownloadUrl} from '../services/nativeDownload.ts';
test('native downloads allow only direct Google file URLs and preserve resource keys',()=>{
 const value='https://drive.google.com/uc?export=download&id=isolated-file&resourcekey=isolated-key';
 assert.equal(browserDownloadUrl(value),value);
 assert.ok(browserDownloadUrl('https://drive.usercontent.google.com/download?id=isolated-file&export=download').includes('/download'));
 for(const value of ['https://drive.google.com/file/d/isolated-file/view','https://attacker.example/uc?export=download&id=isolated-file','javascript:alert(1)','https://drive.google.com/uc?export=download&id=x','https://user:pass@drive.google.com/uc?export=download&id=isolated-file','https://drive.google.com/uc?export=download&id=isolated-file#secret'])assert.throws(()=>browserDownloadUrl(value));
});
