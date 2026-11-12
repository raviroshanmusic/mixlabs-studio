const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs'), ts = require('typescript'), Module = require('node:module');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
let db, inserts, lookups;
const load=Module._load;
Module._load=function(name,...args){
 if(name==='@/lib/supabase/server')return {createClient:async()=>db};
 if(name==='@/lib/email')return {notifyProjectInvite:async()=>{}};
 return load.call(this,name,...args);
};
const {POST}=require('../src/app/api/projects/[id]/members/route.ts'); Module._load=load;
function setup({user={id:'inviter'},allowed=true,error=null,existing=false}={}){
 inserts=[];lookups=[];
 db={auth:{getUser:async()=>({data:{user}})},rpc:async(name,args)=>{
  if(name==='can_invite_project'){assert.equal(args.pid,'project');return {data:allowed,error};}
  lookups.push(name);return {data:null};
 },from(table){
 let payload;const q={select(){return q},eq(){return q},ilike(){return q},insert(v){payload=v;inserts.push(v);return q},maybeSingle:async()=>({data:table==='project_members'&&existing?{id:'existing'}:null}),single:async()=>({data:{id:'new',...payload},error:null})};return q;
 }};
}
const post=(input)=>POST({json:async()=>input},{params:Promise.resolve({id:'project'})});
test('active members can invite all supported roles with server-owned inviter and project',async()=>{
 for(const role of ['viewer','editor','admin']){setup();const response=await post({email:' PERSON@EXAMPLE.TEST ',role,invited_by:'spoof',project_id:'other'});assert.equal(response.status,200);assert.deepEqual(inserts[0],{project_id:'project',user_id:null,email:'person@example.test',full_name:null,role,department:'all',status:'pending',invited_by:'inviter'});}
});
test('outsiders and anonymous users cannot invite or resolve invitee accounts',async()=>{
 setup({allowed:false});assert.equal((await post({email:'a@b.test'})).status,403);assert.equal(inserts.length,0);assert.equal(lookups.length,0);
 setup({user:null});assert.equal((await post({email:'a@b.test'})).status,401);assert.equal(inserts.length,0);
});
test('access-check failures are closed',async()=>{setup({error:{message:'offline'}});assert.equal((await post({email:'a@b.test'})).status,500);assert.equal(inserts.length,0);});
test('invalid roles and malformed requests cannot insert memberships',async()=>{
 for(const input of [null,{email:{}},{email:' '},{email:'a@b.test',role:'owner'},{email:'a@b.test',role:{}}]){setup();assert.equal((await post(input)).status,400);assert.equal(inserts.length,0);}
});
test('duplicates remain rejected',async()=>{setup({existing:true});assert.equal((await post({email:'a@b.test'})).status,409);assert.equal(inserts.length,0);});
