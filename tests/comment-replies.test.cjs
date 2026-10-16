const assert=require('node:assert/strict'); const {test}=require('node:test');
const fs=require('node:fs');const ts=require('typescript');const Module=require('node:module');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {groupReplies,topLevelComments}=require('../src/lib/comment-threads.ts');
const root={id:'root',created_at:'2026-10-16T01:00:00Z'};
test('replies stay chronological beneath their parent and do not add tasks',()=>{
 const replies=[{id:'b',parent_comment_id:'root',created_at:'2026-10-16T03:00:00Z'},{id:'a',parent_comment_id:'root',created_at:'2026-10-16T02:00:00Z'}];
 assert.deepEqual(topLevelComments([root,...replies]),[root]);
 assert.deepEqual(groupReplies([root,...replies]).root.map(r=>r.id),['a','b']);
 assert.equal(replies[0].id,'b'); // grouping never mutates incoming data
});
let db; const load=Module._load;
Module._load=function(name,...args){
 if(name==='@/lib/supabase/server')return {createClient:async()=>db};
 if(name==='@/lib/email')return {notifyMention:async()=>{}};
 return load.call(this,name,...args);
};
const {POST}=require('../src/app/api/projects/[id]/comments/route.ts');Module._load=load;
const parentId='11111111-1111-1111-1111-111111111111';
function setup({parent={id:parentId,version_id:'real-version',timecode:'38',department:'Sound',version_name:'Cut 1',parent_comment_id:null},user={id:'author',email:'owner@example.test'},project={id:'project'}}={}){
 let inserted;
 db={auth:{getUser:async()=>({data:{user}})},from(table){
  let payload;
  const q={select(){return q},eq(){return q},insert(value){payload=value;inserted=value;return q},
   maybeSingle:async()=>({data:table==='projects'?project:parent,error:null}),
   single:async()=>({data:table==='profiles'?{full_name:'Author'}:table==='project_versions'?{department:'Sound',version_name:'Cut 1'}:{id:'reply',...payload},error:null})};return q;
 }};return ()=>inserted;
}
function post(input){return POST({json:async()=>input},{params:Promise.resolve({id:'project'})});}
test('reply inherits parent version and timecode, ignores client spoofing, uses authenticated author',async()=>{
 const get=setup();const res=await post({body:'  Thanks, fixed  ',parent_comment_id:parentId,version_id:'wrong-version',timecode_sec:900,author_id:'other'});
 assert.equal(res.status,200);assert.equal(get().parent_comment_id,parentId);assert.equal(get().version_id,'real-version');assert.equal(get().timecode,'38');assert.equal(get().body,'Thanks, fixed');assert.equal(get().author_id,'author');
});
test('missing/inaccessible parent is rejected without inserting',async()=>{
 const get=setup({parent:null});const res=await post({body:'reply',parent_comment_id:parentId});assert.equal(res.status,404);assert.equal(get(),undefined);
});
test('nested replies and invalid bodies are rejected',async()=>{
 setup({parent:{id:parentId,parent_comment_id:'another'}});assert.equal((await post({body:'reply',parent_comment_id:parentId})).status,400);
 setup();for(const body of ['',null,{},'x'.repeat(10001)])assert.equal((await post({body})).status,400);
});
test('anonymous and inaccessible project requests are rejected',async()=>{
 setup({user:null});assert.equal((await post({body:'reply',parent_comment_id:parentId})).status,401);
 const get=setup({project:null});assert.equal((await post({body:'reply',parent_comment_id:parentId})).status,404);assert.equal(get(),undefined);
});
test('existing top-level notes remain compatible',async()=>{
 const get=setup();assert.equal((await post({body:'a normal note',timecode_sec:12})).status,200);assert.equal(get().parent_comment_id,null);assert.equal(get().timecode,12);
});
