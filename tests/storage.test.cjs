const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../electron/storage.cjs');
const { startServer } = require('../electron/server.cjs');
const data = () => ({ repairs: [{ id:'RD-1049',customer:'Test Customer',device:'Phone',issue:'Screen',technician:'Alex Morgan',date:'2026-10-15',status:'In progress',cost:50 }], parts: [{name:'Screen',sku:'SCREEN',stock:2,minimum:1,price:10}], customers:[{name:'Test Customer',email:'',phone:''}] });
function directory(t) { const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repairdesk-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir; }
test('persistent store survives restart, rejects stale writes and retains a previous version',t=>{
 const dir=directory(t);let store=new Store(dir);
 assert.deepEqual(store.read(),{revision:0,data:null});
 assert.equal(store.write(data(),0).status,200);
 const next=data();next.parts[0].stock=8;
 assert.equal(store.write(next,1).status,200);
 assert.equal(store.write(data(),1).status,409);
 assert.equal(store.read().data.parts[0].stock,8);
 assert.equal(JSON.parse(fs.readFileSync(store.file+'.previous')).data.parts[0].stock,2);
 assert.throws(()=>new Store(dir),/already in use/);
 store.close();store=new Store(dir);
 assert.equal(store.read().revision,2);assert.equal(store.read().data.parts[0].stock,8);store.close();
});
test('corrupt and invalid data are preserved rather than overwritten',t=>{
 const dir=directory(t);const store=new Store(dir);
 assert.equal(store.write({...data(),parts:[{name:'bad',stock:-1}]},0).status,400);store.close();
 fs.writeFileSync(path.join(dir,'workshop.json'),'broken');
 assert.throws(()=>new Store(dir),/could not be read/);
 assert.equal(fs.readFileSync(path.join(dir,'workshop.json'),'utf8'),'broken');
 assert.equal(fs.existsSync(path.join(dir,'workshop.lock')),false);
});
test('two clients share records; API rejects hostile origins and lost updates',{timeout:15000},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repairdesk-api-'));const service=await startServer({directory:dir,port:0});t.after(async()=>{await service.close();fs.rmSync(dir,{recursive:true,force:true});});
 const read=async()=>{const r=await fetch(service.origin+'/api/data');assert.equal(r.status,200);return r.json();};
 const put=async (value,revision,origin=service.origin)=>fetch(service.origin+'/api/data',{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({data:value,revision})});
 assert.equal((await put(data(),0)).status,200);
 const browser=await read();const desktop=await read();desktop.data.parts[0].stock=7;
 assert.equal((await put(desktop.data,desktop.revision)).status,200);
 assert.equal((await read()).data.parts[0].stock,7);
 assert.equal((await put(browser.data,browser.revision)).status,409);
 assert.equal((await put(data(),2,'https://untrusted.example')).status,403);
 assert.equal((await fetch(service.origin+'/api/data',{headers:{Origin:'https://untrusted.example'}})).status,403);
 assert.equal((await fetch(service.origin+'/api/data',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:data(),revision:2})})).status,403);
 const hostStatus=await new Promise((resolve,reject)=>{const request=require('node:http').get(service.origin+'/',{headers:{Host:'attacker.example'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);});
 assert.equal(hostStatus,403);
 assert.equal((await put(data(),2)).status,200);
});
