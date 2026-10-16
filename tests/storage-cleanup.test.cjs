const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
  });
  module._compile(output.outputText, filename);
};
process.env.B2_BUCKET_NAME = 'test-bucket';
const {storageCleaner, storageKey, rowKeys, deleteFileRecord} = require('../src/lib/storage-cleanup.ts');
const {b2} = require('../src/lib/b2.ts');
const id='11111111-1111-1111-1111-111111111111';
const prefix=`projects/${id}/`;
const key=prefix+'movie.mov';
function fake(pages) {
  const calls=[];
  return {calls, send: async command => {
    calls.push(command);
    const response=pages.shift();
    if(response instanceof Error) throw response;
    if(typeof response==='function') return response(command);
    return response ?? {};
  }};
}
test('only app-owned keys are eligible; third-party and other-project links stay intact',()=>{
  assert.equal(storageKey(key,id),key);
  assert.equal(storageKey('/api/media?key='+encodeURIComponent(key),id),key);
  assert.equal(storageKey('https://evil.example/api/media?key='+key,id),null);
  assert.equal(storageKey('https://drive.google.com/'+key,id),null);
  assert.equal(storageKey('projects/22222222-2222-2222-2222-222222222222/a',id),null);
  assert.throws(()=>storageKey(key,''));
  assert.deepEqual(rowKeys({drive_url:key,renditions:[{key:key+'.proxy'}],links:[{url:key},'https://example.com/x']},id),[key,key+'.proxy']);
});
test('project cleanup paginates versions, deletes explicit version IDs and hidden versions, aborts uploads',async()=>{
  const client=fake([
    {Uploads:[{Key:key,UploadId:'upload'}]}, {},
    {Versions:[{Key:key,VersionId:'v1'}],IsTruncated:true,NextKeyMarker:key,NextVersionIdMarker:'v1'},
    {Versions:[{Key:key,VersionId:'v0'}],DeleteMarkers:[{Key:key,VersionId:'hide'}]}, {}, {},
  ]);
  await storageCleaner(client,'bucket').project(id);
  assert.deepEqual(client.calls.map(c=>c.constructor.name),['ListMultipartUploadsCommand','AbortMultipartUploadCommand','ListObjectVersionsCommand','ListObjectVersionsCommand','DeleteObjectsCommand','ListObjectVersionsCommand']);
  assert.deepEqual(client.calls[4].input.Delete.Objects.map(o=>o.VersionId),['v1','v0','hide']);
  assert.equal(client.calls[3].input.VersionIdMarker,'v1');
  assert.equal(client.calls[0].input.Prefix,prefix);
});
test('individual cleanup never deletes a different key that shares the filename prefix',async()=>{
  const client=fake([{Versions:[{Key:key,VersionId:'v1'},{Key:key+'.other',VersionId:'v2'}]}, {}, {Versions:[{Key:key+'.other',VersionId:'v2'}]}]);
  await storageCleaner(client,'bucket').keys([key,key]);
  assert.deepEqual(client.calls[1].input.Delete.Objects,[{Key:key,VersionId:'v1'}]);
});
test('partial deletion and failed verification are failures, not false successes',async()=>{
  await assert.rejects(storageCleaner(fake([{Versions:[{Key:key,VersionId:'v1'}]},{Errors:[{Code:'AccessDenied'}]}]),'bucket').keys([key]),/could not delete/);
  await assert.rejects(storageCleaner(fake([{Versions:[{Key:key,VersionId:'v1'}]}, {}, {Versions:[{Key:key,VersionId:'v1'}]}]),'bucket').keys([key]),/remain/);
});
test('deletion batches over 1000 versions without creating delete markers',async()=>{
  const objects=Array.from({length:1001},(_,n)=>({Key:key,VersionId:String(n)}));
  const client=fake([{Versions:objects},{},{},{}]);
  await storageCleaner(client,'bucket').keys([key]);
  assert.equal(client.calls[1].input.Delete.Objects.length,1000);
  assert.equal(client.calls[2].input.Delete.Objects.length,1);
});
function dbMock({access=true, rpcError=null, shared=false, owner=false}={}) {
  let deleted=false;
  return { get deleted(){return deleted;}, rpc: async()=>({data:access,error:rpcError}), from(table){
    let selection='', deleting=false;
    const query={select(s){selection=s;return query;},eq(){return query;},order(){return query;},range(){return query;},maybeSingle(){return Promise.resolve({data:owner?{owner_id:'user'}:null,error:null});},delete(){deleting=true;return query;},then(resolve){
      if(deleting){deleted=true;return Promise.resolve(resolve({data:[{id:'target'}],error:null}));}
      let data=[];
      if(table==='project_versions')data=selection==='id,renditions'?[{id:'target',renditions:[{key:key+'.proxy'}]}]:[{id:'target',drive_url:key}];
      if(table==='project_documents'&&shared)data=[{id:'shared',file_key:key}];
      return Promise.resolve(resolve({data,error:null}));
    }};return query;
  }};
}
test('unauthorized and failed authorization never touch storage',async()=>{
  const old=b2.send; b2.send=()=>{throw Error('must not touch storage');};
  try{
    for(const db of [dbMock({access:false}),dbMock({rpcError:{message:'unavailable'}})]){
      assert.equal((await deleteFileRecord(db,id,'project_versions','target','user')).status,403);
      assert.equal(db.deleted,false);
    }
  }finally{b2.send=old;}
});
test('storage failure retains the database record for retry',async()=>{
  const old=b2.send; b2.send=async()=>{throw Error('storage offline');};const db=dbMock();
  try{await assert.rejects(deleteFileRecord(db,id,'project_versions','target','user'),/offline/);assert.equal(db.deleted,false);}
  finally{b2.send=old;}
});
test('shared original is retained while unshared proxy is cleaned before deleting record',async()=>{
  const old=b2.send;const client=fake([{},{}]);b2.send=client.send;const db=dbMock({shared:true});
  try{
    assert.equal((await deleteFileRecord(db,id,'project_versions','target','user')).status,200);
    assert.equal(db.deleted,true);
    assert.deepEqual(client.calls.map(c=>c.input.Prefix),[key+'.proxy',key+'.proxy']);
  }finally{b2.send=old;}
});

test('project owners work even before the optional editor RPC is installed',async()=>{
 const old=b2.send; b2.send=async()=>({});const db=dbMock({owner:true,rpcError:{message:'missing function'}});
 try{assert.equal((await deleteFileRecord(db,id,'project_versions','target','user')).status,200);}
 finally{b2.send=old;}
});
