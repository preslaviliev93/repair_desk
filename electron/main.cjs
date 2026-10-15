const {app,BrowserWindow}=require('electron');
const path=require('node:path');
app.whenReady().then(()=>{const win=new BrowserWindow({width:1480,height:940,minWidth:1000,minHeight:700,backgroundColor:'#10151b',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.loadFile(path.join(__dirname,'../dist/index.html'));});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
