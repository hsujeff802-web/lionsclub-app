(function(){
  'use strict';

  const VERSION='V2.0.3 財務愛心資料永久保存加強版';
  const DB_NAME='LionsClubPersistentDB';
  const STORE_NAME='appData';
  const RECORD_KEY='main';
  const SHADOW_KEY='lionsclub_appstore_shadow_v203';
  const TS_KEY='lionsclub_appstore_shadow_ts_v203';
  let saving=false, saveTimer=null, lastFingerprint='';

  function appKey(){
    try{return window.STORAGE_KEY||'lionsclub_appstore_v100';}
    catch(e){return 'lionsclub_appstore_v100';}
  }
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return {};}}
  function parse(v){try{return v?JSON.parse(v):null;}catch(e){return null;}}
  function currentData(){
    if(window.db&&typeof window.db==='object')return clone(window.db);
    try{const raw=localStorage.getItem(appKey());return raw?JSON.parse(raw):{};}catch(e){return {};}
  }
  function fingerprint(data){try{return JSON.stringify(data);}catch(e){return '';}}
  function hasRecords(data){
    if(!data||typeof data!=='object')return false;
    return (Array.isArray(data.finance)&&data.finance.length>0) ||
           (Array.isArray(data.loveFund)&&data.loveFund.length>0) ||
           (Array.isArray(data.members)&&data.members.length>0) ||
           (Array.isArray(data.meetings)&&data.meetings.length>0);
  }
  function recordScore(data){
    if(!data||typeof data!=='object')return 0;
    return ((data.finance||[]).length*4)+((data.loveFund||[]).length*4)+
           ((data.members||[]).length)+((data.meetings||[]).length);
  }

  function openIdb(){
    return new Promise(function(resolve,reject){
      if(!('indexedDB' in window))return resolve(null);
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(){
        const idb=req.result;
        if(!idb.objectStoreNames.contains(STORE_NAME))idb.createObjectStore(STORE_NAME);
      };
      req.onsuccess=function(){resolve(req.result);};
      req.onerror=function(){reject(req.error);};
    });
  }
  async function saveIdb(envelope){
    try{
      const idb=await openIdb(); if(!idb)return;
      await new Promise(function(resolve,reject){
        const tx=idb.transaction(STORE_NAME,'readwrite');
        tx.objectStore(STORE_NAME).put(envelope,RECORD_KEY);
        tx.oncomplete=resolve; tx.onerror=function(){reject(tx.error);};
      });
      idb.close();
    }catch(e){console.warn('IndexedDB save failed',e);}
  }
  async function loadIdb(){
    try{
      const idb=await openIdb(); if(!idb)return null;
      const result=await new Promise(function(resolve,reject){
        const tx=idb.transaction(STORE_NAME,'readonly');
        const req=tx.objectStore(STORE_NAME).get(RECORD_KEY);
        req.onsuccess=function(){resolve(req.result||null);};
        req.onerror=function(){reject(req.error);};
      });
      idb.close(); return result;
    }catch(e){console.warn('IndexedDB load failed',e);return null;}
  }

  function saveLocal(envelope){
    const dataText=JSON.stringify(envelope.data);
    localStorage.setItem(appKey(),dataText);
    localStorage.setItem(SHADOW_KEY,JSON.stringify(envelope));
    localStorage.setItem(TS_KEY,String(envelope.savedAt));
    ['lionsclub-db-v26','lionsclub-mobile-db','lionsclub-db','lionsclub-v26-db','lionsclub-v201-backup'].forEach(function(k){
      try{localStorage.setItem(k,dataText);}catch(e){}
    });
  }
  function makeEnvelope(reason){
    return {format:'LionsClubPersistentData',version:VERSION,savedAt:Date.now(),
            reason:reason||'manual',data:currentData()};
  }
  async function durableSave(reason){
    if(saving){scheduleSave(reason,180);return;}
    saving=true;
    try{
      const envelope=makeEnvelope(reason);
      saveLocal(envelope);
      lastFingerprint=fingerprint(envelope.data);
      await saveIdb(envelope);
      updateStatus('資料已永久保存：'+new Date(envelope.savedAt).toLocaleString('zh-TW'));
    }catch(e){
      console.error(e); updateStatus('資料保存失敗，請立即下載備份。');
    }finally{saving=false;}
  }
  function scheduleSave(reason,delay){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){durableSave(reason);},delay||250);
  }
  function localEnvelope(){
    try{
      const shadow=parse(localStorage.getItem(SHADOW_KEY));
      if(shadow&&shadow.data)return shadow;
      const main=parse(localStorage.getItem(appKey()));
      if(main)return {savedAt:Number(localStorage.getItem(TS_KEY)||0),data:main};
    }catch(e){}
    return null;
  }
  async function restoreBest(){
    const main=parse(localStorage.getItem(appKey()));
    const local=localEnvelope();
    const idb=await loadIdb();
    const candidates=[];
    if(main&&hasRecords(main))candidates.push({savedAt:0,data:main});
    if(local&&local.data&&hasRecords(local.data))candidates.push({savedAt:Number(local.savedAt||0),data:local.data});
    if(idb&&idb.data&&hasRecords(idb.data))candidates.push({savedAt:Number(idb.savedAt||0),data:idb.data});
    if(!candidates.length)return false;
    candidates.sort(function(a,b){
      const sa=recordScore(a.data),sb=recordScore(b.data);
      if(sa!==sb)return sb-sa;
      return Number(b.savedAt||0)-Number(a.savedAt||0);
    });
    const best=candidates[0];
    localStorage.setItem(appKey(),JSON.stringify(best.data));
    window.db=clone(best.data);
    lastFingerprint=fingerprint(best.data);
    return true;
  }

  function updateStatus(text){
    let el=document.getElementById('v201PersistStatus');
    if(!el){
      const page=document.getElementById('finance')||document.querySelector('main');
      if(!page)return;
      el=document.createElement('div');
      el.id='v201PersistStatus'; el.className='notice no-print'; el.style.marginBottom='10px';
      const card=page.querySelector('.card');
      if(card)card.insertBefore(el,card.firstChild); else page.insertBefore(el,page.firstChild);
    }
    el.textContent=text;
  }
  function wrapSave(name){
    const old=window[name];
    if(typeof old!=='function'||old.__v203Wrapped)return;
    const wrapped=function(){
      const result=old.apply(this,arguments);
      scheduleSave(name,120);
      setTimeout(function(){scheduleSave(name+'-late',120);},500);
      return result;
    };
    wrapped.__v203Wrapped=true; window[name]=wrapped;
  }
  function installWrappers(){
    ['persist','saveFinanceGrid','saveLoveGrid','addFinance','addLove',
     'financeLedgerSave','loveGridSave','saveMember','saveMeeting',
     'saveSettings','saveRoles','saveAdminPassword116','renderFinance','renderLove'].forEach(wrapSave);
  }
  function installActivityGuard(){
    ['click','change'].forEach(function(evt){
      document.addEventListener(evt,function(){scheduleSave('ui-'+evt,350);},true);
    });
    setInterval(function(){
      try{
        if(!window.db||typeof window.db!=='object')return;
        const fp=fingerprint(window.db);
        if(fp&&fp!==lastFingerprint)scheduleSave('db-change-watch',120);
      }catch(e){}
    },700);
  }
  function labels(){
    try{document.title='龍興會智慧管理系統 '+VERSION;}catch(e){}
    try{const small=document.querySelector('.brand small');
      if(small)small.textContent=VERSION+'｜財務與愛心基金自動永久保存';}catch(e){}
    try{const badge=document.querySelector('.update-badge');
      if(badge)badge.textContent='永久保存・V2.0.3';}catch(e){}
  }
  async function boot(){
    labels(); updateStatus('正在檢查已保存資料…');
    const restored=await restoreBest();
    installWrappers(); installActivityGuard();
    setTimeout(installWrappers,500); setTimeout(installWrappers,1500); setTimeout(installWrappers,3000);
    if(restored){
      try{
        if(typeof renderAll==='function')renderAll();
        if(typeof renderFinance==='function')renderFinance();
        if(typeof renderLove==='function')renderLove();
      }catch(e){}
      updateStatus('已恢復保存資料；之後每次新增或修改都會自動永久保存。');
    }else updateStatus('永久保存功能已啟用；新增或修改後會自動保存。');
    scheduleSave('startup-sync',1500);
  }
  window.LionsClubPersistence={save:function(){return durableSave('manual-api');},restore:restoreBest,version:VERSION};
  window.addEventListener('pagehide',function(){try{saveLocal(makeEnvelope('pagehide'));}catch(e){}});
  window.addEventListener('beforeunload',function(){try{saveLocal(makeEnvelope('beforeunload'));}catch(e){}});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')durableSave('visibility-hidden');});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
