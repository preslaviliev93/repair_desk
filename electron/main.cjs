const {app,BrowserWindow,Menu,shell,dialog}=require('electron');
const {connectOrStart}=require('./server.cjs');
const path=require('node:path');
let service;
async function importPreviousDesktop() {
  let reader;
  try {
    reader=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
    await reader.loadFile(path.join(__dirname,'../dist/index.html'));
    const raw=await reader.webContents.executeJavaScript("localStorage.getItem('repairdesk-v1')");
    reader.destroy();reader=null;
    if(!raw){await dialog.showMessageBox({message:'No previous desktop records found.',detail:'You can also restore an exported JSON backup from Settings.'});return;}
    const current=await (await fetch(service.origin+'/api/data')).json();
    const choice=await dialog.showMessageBox({type:'warning',message:'Replace shared records with your previous desktop records?',detail:'This affects the app and browser. Export a backup from Settings first. The old desktop records will also be kept.',buttons:['Cancel','Import previous records'],defaultId:0,cancelId:0});
    if(choice.response!==1)return;
    const response=await fetch(service.origin+'/api/data',{method:'PUT',headers:{'Content-Type':'application/json',Origin:service.origin},body:JSON.stringify({revision:current.revision,data:JSON.parse(raw)})});
    const result=await response.json();
    if(!response.ok)throw Error(result.error);
    await dialog.showMessageBox({message:'Previous desktop records imported into shared storage.'});
  } catch(error){dialog.showErrorBox('Previous records could not be imported',error.message);}
  finally{reader?.destroy();}
}
if(!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance',()=>{const win=BrowserWindow.getAllWindows()[0];if(win){if(win.isMinimized())win.restore();win.focus();}});
  app.whenReady().then(async()=>{
    service=await connectOrStart();
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'File',submenu:[{label:'Open in browser',click:()=>shell.openExternal(service.origin)},{label:'Import previous desktop records',click:importPreviousDesktop},{role:'quit'}]},
      {role:'editMenu'},{role:'viewMenu'}
    ]));
    const win=new BrowserWindow({width:1480,height:940,minWidth:1000,minHeight:700,backgroundColor:'#10151b',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==service.origin)e.preventDefault();});
    await win.loadURL(service.origin);
  }).catch(error=>{dialog.showErrorBox('RepairDesk could not start',error.message);app.quit();});
  app.on('window-all-closed',()=>app.quit());
  app.on('will-quit',()=>{service?.server?.close();service?.store?.close();});
}
