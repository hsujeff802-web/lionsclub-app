
(function(){
  'use strict';

  const VERSION='DEV V1.1.68 資料匯出匯入備份版';
  const SNAPSHOT_KEY='lionsclub_appstore_last_snapshot_v168';

  function $(id){return document.getElementById(id);}
  function pad(v){return String(v).padStart(2,'0');}
  function dateStamp(){
    const d=new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }
  function timeStamp(){
    const d=new Date();
    return dateStamp()+'_'+pad(d.getHours())+'-'+pad(d.getMinutes())+'-'+pad(d.getSeconds());
  }
  function downloadText(filename,text,type){
    const blob=new Blob([text],{type:type||'application/json;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
  }
  function cloneData(v){
    return JSON.parse(JSON.stringify(v));
  }
  function currentDb(){
    if(window.db && typeof window.db==='object')return cloneData(window.db);
    try{
      const raw=localStorage.getItem(window.STORAGE_KEY||'lionsclub_appstore_v100');
      return raw?JSON.parse(raw):{};
    }catch(e){return {};}
  }
  function appStorageKey(){
    try{return window.STORAGE_KEY||'lionsclub_appstore_v100';}
    catch(e){return 'lionsclub_appstore_v100';}
  }
  function makeBackupObject(reason){
    return {
      format:'LionsClub-App-Backup',
      schemaVersion:1,
      appVersion:VERSION,
      createdAt:new Date().toISOString(),
      reason:reason||'manual-export',
      storageKey:appStorageKey(),
      data:currentDb()
    };
  }
  function validBackup(obj){
    return obj && typeof obj==='object' &&
      obj.format==='LionsClub-App-Backup' &&
      obj.data && typeof obj.data==='object';
  }
  function refreshApp(){
    try{
      const raw=localStorage.getItem(appStorageKey());
      if(raw)window.db=JSON.parse(raw);
    }catch(e){}
    try{if(typeof renderAll==='function')renderAll();}catch(e){}
    try{if(typeof loadSettings==='function')loadSettings();}catch(e){}
    try{if(typeof renderMemberNames==='function')renderMemberNames();}catch(e){}
    try{if(typeof syncPaymentRoster==='function')syncPaymentRoster(false);}catch(e){}
    try{if(typeof applyPermissions==='function')applyPermissions();}catch(e){}
  }

  window.exportAllLionsDataV168=function(){
    try{
      const pack=makeBackupObject('manual-export');
      const club=(pack.data.settings&&pack.data.settings.club)||'龍興獅子會';
      downloadText(club+'_'+timeStamp()+'_完整備份.json',JSON.stringify(pack,null,2));
      alert('完整資料備份已下載。');
    }catch(e){
      console.error(e);
      alert('匯出失敗，請再試一次。');
    }
  };

  window.createTodaySnapshotV168=function(){
    try{
      const pack=makeBackupObject('today-snapshot');
      try{sessionStorage.setItem(SNAPSHOT_KEY,JSON.stringify(pack));}catch(e){}
      downloadText('龍興獅子會_'+dateStamp()+'_今日備份.json',JSON.stringify(pack,null,2));
      const info=$('v168BackupStatus');
      if(info)info.textContent='已建立今日備份：'+new Date().toLocaleString('zh-TW');
      alert('今日備份已建立並下載。');
    }catch(e){
      console.error(e);
      alert('建立今日備份失敗。');
    }
  };

  window.importAllLionsDataV168=function(input){
    const file=input && input.files && input.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=function(){
      try{
        const obj=JSON.parse(String(reader.result||''));
        if(!validBackup(obj))throw new Error('備份格式不符');
        const before=makeBackupObject('before-import');
        try{sessionStorage.setItem(SNAPSHOT_KEY,JSON.stringify(before));}catch(e){}
        try{localStorage.setItem(appStorageKey(),JSON.stringify(obj.data));}catch(e){console.warn('localStorage已滿，匯入後將交由永久儲存保存',e);}
        window.db=cloneData(obj.data);
        try{if(window.LionsClubPersistence&&typeof window.LionsClubPersistence.save==='function')window.LionsClubPersistence.save();}catch(e){}
        refreshApp();
        alert('資料匯入完成。系統將重新整理。');
        location.reload();
      }catch(e){
        console.error(e);
        alert('匯入失敗：這不是本系統的完整備份檔，或檔案已損壞。');
      }finally{
        input.value='';
      }
    };
    reader.readAsText(file,'utf-8');
  };

  window.restoreLastSnapshotV168=function(){
    try{
      const raw=sessionStorage.getItem(SNAPSHOT_KEY);
      if(!raw)return alert('目前沒有可還原的上一份備份。');
      const obj=JSON.parse(raw);
      if(!validBackup(obj))throw new Error('snapshot invalid');
      if(!confirm('確定要還原上一份備份嗎？目前資料會被覆蓋。'))return;
      try{localStorage.setItem(appStorageKey(),JSON.stringify(obj.data));}catch(e){console.warn(e);}
      window.db=cloneData(obj.data);
      try{if(window.LionsClubPersistence&&typeof window.LionsClubPersistence.save==='function')window.LionsClubPersistence.save();}catch(e){}
      refreshApp();
      alert('上一份備份已還原，系統將重新整理。');
      location.reload();
    }catch(e){
      console.error(e);
      alert('還原失敗。');
    }
  };

  function addPanel(){
    if($('v168BackupPanel'))return;
    const page=$('settings') || document.querySelector('[data-page="settings"]') || document.querySelector('main');
    if(!page)return;

    const card=document.createElement('div');
    card.className='card no-print';
    card.id='v168BackupPanel';
    card.innerHTML=
      '<h2>資料備份與匯入</h2>'+
      '<p class="notice">換版本前先按「匯出全部資料」。新版本開啟後，再按「匯入全部資料」選擇 JSON 備份檔。</p>'+
      '<div class="actions" style="display:flex;flex-wrap:wrap;gap:10px">'+
        '<button type="button" class="primary" onclick="exportAllLionsDataV168()">📤 匯出全部資料</button>'+
        '<label class="success" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:10px;cursor:pointer;font-weight:700">📥 匯入全部資料<input type="file" accept=".json,application/json" style="display:none" onchange="importAllLionsDataV168(this)"></label>'+
        '<button type="button" class="dark" onclick="createTodaySnapshotV168()">💾 建立今日備份</button>'+
        '<button type="button" class="warning" onclick="restoreLastSnapshotV168()">↩ 還原上一份備份</button>'+
      '</div>'+
      '<p id="v168BackupStatus" class="notice" style="margin-top:10px">備份內容包含：會員、獅嫂、財務、愛心基金、會議議程、公文、設定、科目、人員、場地與職員資料。</p>';

    const first=page.querySelector('.card');
    if(first)page.insertBefore(card,first);
    else page.appendChild(card);
  }

  function labels(){
    try{document.title='龍興會智慧管理系統 '+VERSION;}catch(e){}
    try{
      const small=document.querySelector('.brand small');
      if(small)small.textContent=VERSION+'｜完整資料可匯出、匯入、還原';
    }catch(e){}
    try{
      const badge=document.querySelector('.update-badge');
      if(badge)badge.textContent='備份匯入・V1.1.68';
    }catch(e){}
  }

  function boot(){
    labels();
    addPanel();
    setTimeout(addPanel,500);
    setTimeout(addPanel,1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
