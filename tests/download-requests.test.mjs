import test from 'node:test';
import assert from 'node:assert/strict';
import {recordDownloadRequest,getDownloadRequests,clearDownloadRequests,subscribeDownloadRequests} from '../services/downloadRequests.ts';

test('download requests remain unique and the immutable snapshot survives repeated reads',()=>{
 clearDownloadRequests();const before=getDownloadRequests();recordDownloadRequest('fixture-one');const first=getDownloadRequests();recordDownloadRequest('fixture-one');
 assert.equal(getDownloadRequests(),first);assert.equal(before.size,0);assert.deepEqual([...first],['fixture-one']);
 recordDownloadRequest('fixture-two');assert.deepEqual([...getDownloadRequests()],['fixture-one','fixture-two']);assert.equal(first.size,1);clearDownloadRequests();
});
test('subscribers receive real changes and clearing markers is repeatable',()=>{
 clearDownloadRequests();let changes=0;const unsubscribe=subscribeDownloadRequests(()=>changes++);
 recordDownloadRequest('fixture-one');recordDownloadRequest('fixture-one');clearDownloadRequests();clearDownloadRequests();assert.equal(changes,2);
 unsubscribe();recordDownloadRequest('fixture-two');assert.equal(changes,2);clearDownloadRequests();
});
