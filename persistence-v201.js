
(function(){
  'use strict';

  const VERSION='V2.0.1 財務愛心資料永久保存修正版';
  const DB_NAME='LionsClubPersistentDB';
  const STORE_NAME='appData';
  const RECORD_KEY='main';
  const SHADOW_KEY='lionsclub_appstore_shadow_v201';
  const TS_KEY='lionsclub_appstore_shadow_ts_v201';
  let saving=false;

  function appKey(){
    try{return window.STORAGE_KEY||'lionsclub_appstore_v100';}
    catch(e){return 'lionsclub_appstore_v100';}
  }

  function clone(v){
    return JSON.parse(JSON.stringify(v));
  }

  function currentData(){
    if(window.db&&typeof window.db==='object')return clone(window.db);
    try{
      const raw=localStorage.getItem(appKey());
      return raw?JSON.parse(raw):{};
    }catch(e){return {};}
  }

  function openIdb(){
    return new Promise(function(resolve,reject){
      if(!('indexedDB' in window))return resolve(null);
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(){
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME);
      };
      req.onsuccess=function(){resolve(req.result);};
      req.onerror=function(){reject(req.error);};
    });
  }

  async function saveIdb(envelope){
    try{
      const idb=await openIdb();
      if(!idb)return;
      await new Promise(function(resolve,reject){
        const tx=idb.transaction(STORE_NAME,'readwrite');
        tx.objectStore(STORE_NAME).put(envelope,RECORD_KEY);
        tx.oncomplete=resolve;
        tx.onerror=function(){reject(tx.error);};
      });
      idb.close();
    }catch(e){
      console.warn('IndexedDB save failed',e);
    }
  }

  async function loadIdb(){
    try{
      const idb=await openIdb();
      if(!idb)return null;
      const result=await new Promise(function(resolve,reject){
        const tx=idb.transaction(STORE_NAME,'readonly');
        const req=tx.objectStore(STORE_NAME).get(RECORD_KEY);
        req.onsuccess=function(){resolve(req.result||null);};
        req.onerror=function(){reject(req.error);};
      });
      idb.close();
      return result;
    }catch(e){
      console.warn('IndexedDB load failed',e);
      return null;
    }
  }

  function saveLocal(envelope){
    const text=JSON.stringify(envelope);
    localStorage.setItem(appKey(),JSON.stringify(envelope.data));
    localStorage.setItem(SHADOW_KEY,text);
    localStorage.setItem(TS_KEY,String(envelope.savedAt));
  }

  async function durableSave(reason){
    if(saving)return;
    saving=true;
    try{
      const envelope={
        format:'LionsClubPersistentData',
        version:VERSION,
        savedAt:Date.now(),
        reason:reason||'manual',
        data:currentData()
      };
      saveLocal(envelope);
      await saveIdb(envelope);
      updateStatus('資料已永久保存：'+new Date(envelope.savedAt).toLocaleString('zh-TW'));
    }catch(e){
      console.error(e);
      updateStatus('資料保存失敗，請立即匯出備份。');
    }finally{
      saving=false;
    }
  }

  function localEnvelope(){
    try{
      const raw=localStorage.getItem(SHADOW_KEY);
      if(raw){
        const x=JSON.parse(raw);
        if(x&&x.data)return x;
      }
      const main=localStorage.getItem(appKey());
      if(main)return {savedAt:Number(localStorage.getItem(TS_KEY)||0),data:JSON.parse(main)};
    }catch(e){}
    return null;
  }

  function hasRecords(data){
    if(!data||typeof data!=='object')return false;
    return (Array.isArray(data.finance)&&data.finance.length>0) ||
           (Array.isArray(data.loveFund)&&data.loveFund.length>0) ||
           (Array.isArray(data.members)&&data.members.length>0);
  }

  async function restoreBest(){
    const local=localEnvelope();
    const idb=await loadIdb();
    let best=null;
    [local,idb].forEach(function(x){
      if(!x||!x.data)return;
      if(!best || Number(x.savedAt||0)>Number(best.savedAt||0))best=x;
    });
    if(!best||!hasRecords(best.data))return false;

    let current=null;
    try{
      const raw=localStorage.getItem(appKey());
      current=raw?JSON.parse(raw):null;
    }catch(e){}

    const currentCount=((current&&current.finance)||[]).length+((current&&current.loveFund)||[]).length;
    const bestCount=((best.data.finance)||[]).length+((best.data.loveFund)||[]).length;

    if(bestCount>=currentCount){
      localStorage.setItem(appKey(),JSON.stringify(best.data));
      window.db=clone(best.data);
      return true;
    }
    return false;
  }

  function updateStatus(text){
    let el=document.getElementById('v201PersistStatus');
    if(!el){
      const page=document.getElementById('finance')||document.querySelector('main');
      if(!page)return;
      el=document.createElement('div');
      el.id='v201PersistStatus';
      el.className='notice no-print';
      el.style.marginBottom='10px';
      const card=page.querySelector('.card');
      if(card)card.insertBefore(el,card.firstChild);
      else page.insertBefore(el,page.firstChild);
    }
    el.textContent=text;
  }

  function wrapSave(name){
    const old=window[name];
    if(typeof old!=='function'||old.__v201Wrapped)return;
    const wrapped=function(){
      const result=old.apply(this,arguments);
      setTimeout(function(){durableSave(name);},120);
      return result;
    };
    wrapped.__v201Wrapped=true;
    window[name]=wrapped;
  }

  function installWrappers(){
    ['persist','saveFinanceGrid','saveLoveGrid','addFinance','addLove',
     'financeLedgerSave','loveGridSave','saveMember','saveMeeting',
     'saveSettings','saveRoles','saveAdminPassword116'].forEach(wrapSave);
  }

  function labels(){
    try{document.title='龍興會智慧管理系統 '+VERSION;}catch(e){}
    try{
      const small=document.querySelector('.brand small');
      if(small)small.textContent=VERSION+'｜關閉程式後資料仍保留';
    }catch(e){}
    try{
      const badge=document.querySelector('.update-badge');
      if(badge)badge.textContent='永久保存・V2.0.1';
    }catch(e){}
  }

  async function boot(){
    labels();
    updateStatus('正在檢查已保存資料…');
    const restored=await restoreBest();

    installWrappers();
    setTimeout(installWrappers,500);
    setTimeout(installWrappers,1500);

    if(restored){
      try{
        if(typeof renderAll==='function')renderAll();
        if(typeof renderFinance==='function')renderFinance();
        if(typeof renderLove==='function')renderLove();
      }catch(e){}
      updateStatus('已恢復上次保存的財務與愛心基金資料。');
    }else{
      updateStatus('永久保存功能已啟用。儲存表格後可直接關閉程式。');
    }

    setTimeout(function(){durableSave('startup-sync');},1200);
  }

  window.addEventListener('beforeunload',function(){
    try{
      const envelope={
        format:'LionsClubPersistentData',
        version:VERSION,
        savedAt:Date.now(),
        reason:'beforeunload',
        data:currentData()
      };
      saveLocal(envelope);
    }catch(e){}
  });

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden')durableSave('visibility-hidden');
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
