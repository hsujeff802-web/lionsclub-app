(function(){
  'use strict';

  const VERSION='V2.0.5 F5永久保存修正版';
  const DB_NAME='LionsClubPersistentDB';
  const STORE_NAME='appData';
  const RECORD_KEY='main';
  const TS_KEY='lionsclub_persist_ts_v204';
  const RELOAD_GUARD='lionsclub_v205_restore_reload';
  const LEGACY_DUP_KEYS=[
    'lionsclub_appstore_shadow_v203','lionsclub_appstore_shadow_ts_v203',
    'lionsclub-db-v26','lionsclub-mobile-db','lionsclub-db','lionsclub-v26-db','lionsclub-v201-backup',
    'lionsclub_logout_backup_v202'
  ];
  let saving=false, saveTimer=null, lastFingerprint='', lastSavedAt=0;

  function appKey(){
    try{return window.STORAGE_KEY||'lionsclub_appstore_v100';}
    catch(e){return 'lionsclub_appstore_v100';}
  }
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return {};}}
  function parse(v){try{return v?JSON.parse(v):null;}catch(e){return null;}}
  function readLocalMain(){
    try{
      const data=parse(localStorage.getItem(appKey()));
      return data&&typeof data==='object'?data:null;
    }catch(e){return null;}
  }
  function currentData(){
    const local=readLocalMain();
    if(local)return clone(local);
    if(window.db&&typeof window.db==='object')return clone(window.db);
    if(window.appData&&typeof window.appData==='object')return clone(window.appData);
    return {};
  }
  function fingerprint(data){try{return JSON.stringify(data);}catch(e){return '';}}
  function hasUsefulData(data){
    return !!(data&&typeof data==='object' && (
      (Array.isArray(data.finance)&&data.finance.length) ||
      (Array.isArray(data.loveFund)&&data.loveFund.length) ||
      (Array.isArray(data.members)&&data.members.length) ||
      (Array.isArray(data.meetings)&&data.meetings.length) ||
      (data.settings&&typeof data.settings==='object')
    ));
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
    const idb=await openIdb(); if(!idb)return false;
    try{
      await new Promise(function(resolve,reject){
        const tx=idb.transaction(STORE_NAME,'readwrite');
        tx.objectStore(STORE_NAME).put(envelope,RECORD_KEY);
        tx.oncomplete=resolve;
        tx.onerror=function(){reject(tx.error);};
        tx.onabort=function(){reject(tx.error);};
      });
      return true;
    }finally{try{idb.close();}catch(e){}}
  }
  async function loadIdb(){
    try{
      const idb=await openIdb(); if(!idb)return null;
      try{
        return await new Promise(function(resolve,reject){
          const tx=idb.transaction(STORE_NAME,'readonly');
          const req=tx.objectStore(STORE_NAME).get(RECORD_KEY);
          req.onsuccess=function(){resolve(req.result||null);};
          req.onerror=function(){reject(req.error);};
        });
      }finally{try{idb.close();}catch(e){}}
    }catch(e){console.warn('IndexedDB load failed',e);return null;}
  }

  function cleanupLegacyDuplicates(){
    LEGACY_DUP_KEYS.forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
  }
  function saveLocalMain(data,savedAt){
    try{
      localStorage.setItem(appKey(),JSON.stringify(data));
      localStorage.setItem(TS_KEY,String(savedAt||Date.now()));
      return true;
    }catch(e){
      if(e&&(/QuotaExceeded/i.test(String(e.name))||/quota/i.test(String(e.message)))){
        console.warn('localStorage 已滿，改由 IndexedDB 永久保存。');
        return false;
      }
      throw e;
    }
  }
  function makeEnvelope(reason,dataOverride){
    return {format:'LionsClubPersistentData',version:VERSION,savedAt:Date.now(),reason:reason||'manual',data:clone(dataOverride||currentData())};
  }
  async function durableSave(reason,dataOverride){
    if(saving){scheduleSave(reason,220);return false;}
    saving=true;
    try{
      const envelope=makeEnvelope(reason,dataOverride);
      if(!hasUsefulData(envelope.data)){
        const old=await loadIdb();
        if(old&&old.data&&hasUsefulData(old.data))return false;
      }
      const idbOk=await saveIdb(envelope);
      const localOk=saveLocalMain(envelope.data,envelope.savedAt);
      lastSavedAt=envelope.savedAt;
      lastFingerprint=fingerprint(envelope.data);
      updateStatus('資料已永久保存：'+new Date(envelope.savedAt).toLocaleString('zh-TW')+(localOk?'':'（IndexedDB）'));
      return !!(idbOk||localOk);
    }catch(e){
      console.error(e); updateStatus('資料保存失敗，請立即下載備份。'); return false;
    }finally{saving=false;}
  }
  function scheduleSave(reason,delay){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){durableSave(reason);},delay||300);
  }

  function localCandidate(){
    try{
      const data=readLocalMain();
      if(!data||!hasUsefulData(data))return null;
      return {savedAt:Number(localStorage.getItem(TS_KEY)||0),data:data,source:'localStorage'};
    }catch(e){return null;}
  }
  async function restoreBest(){
    const local=localCandidate();
    const idb=await loadIdb();
    const candidates=[];
    if(local)candidates.push(local);
    if(idb&&idb.data&&hasUsefulData(idb.data))candidates.push({savedAt:Number(idb.savedAt||0),data:idb.data,source:'IndexedDB'});
    if(!candidates.length)return {restored:false,reload:false};

    candidates.sort(function(a,b){return Number(b.savedAt||0)-Number(a.savedAt||0);});
    let best=candidates[0];
    if(Number(best.savedAt||0)===0 && local)best=local;

    const localFp=local?fingerprint(local.data):'';
    const bestFp=fingerprint(best.data);
    let needsReload=false;
    if(best.source==='IndexedDB' && bestFp && bestFp!==localFp){
      saveLocalMain(best.data,Number(best.savedAt||Date.now()));
      needsReload=true;
    }
    window.db=clone(best.data);
    lastSavedAt=Number(best.savedAt||Date.now());
    lastFingerprint=bestFp;
    if(best.source!=='IndexedDB')try{saveLocalMain(best.data,lastSavedAt);}catch(e){}
    return {restored:best.source||true,reload:needsReload};
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
    if(typeof old!=='function'||old.__v205Wrapped)return;
    const wrapped=function(){
      const result=old.apply(this,arguments);
      setTimeout(function(){
        const fresh=readLocalMain();
        if(fresh&&hasUsefulData(fresh))durableSave(name+'-postpersist',fresh);
        else scheduleSave(name,120);
      },30);
      return result;
    };
    wrapped.__v205Wrapped=true; window[name]=wrapped;
  }
  function installWrappers(){
    ['persist','saveFinanceGrid','saveLoveGrid','addFinance','addLove',
     'financeLedgerSave','loveGridSave','saveMember','saveMeeting',
     'saveSettings','saveRoles','saveAdminPassword116'].forEach(wrapSave);
  }
  function installActivityGuard(){
    document.addEventListener('change',function(){scheduleSave('ui-change',520);},true);
    setInterval(function(){
      try{
        const fresh=readLocalMain();
        if(!fresh)return;
        const fp=fingerprint(fresh);
        if(fp&&fp!==lastFingerprint)durableSave('local-main-change',fresh);
      }catch(e){}
    },900);
  }
  function labels(){
    try{document.title='龍興會智慧管理系統 '+VERSION;}catch(e){}
    try{const small=document.querySelector('.brand small');if(small)small.textContent=VERSION+'｜F5 後資料永久保留';}catch(e){}
    try{const badge=document.querySelector('.update-badge');if(badge)badge.textContent='修正版・V2.0.5';}catch(e){}
  }
  async function boot(){
    labels(); updateStatus('正在檢查已保存資料…');
    const result=await restoreBest();
    cleanupLegacyDuplicates();

    if(result.reload){
      try{
        if(sessionStorage.getItem(RELOAD_GUARD)!=='1'){
          sessionStorage.setItem(RELOAD_GUARD,'1');
          updateStatus('已找到較新的永久資料，正在重新載入…');
          setTimeout(function(){location.reload();},120);
          return;
        }
      }catch(e){}
    }
    try{sessionStorage.removeItem(RELOAD_GUARD);}catch(e){}

    installWrappers(); installActivityGuard();
    setTimeout(installWrappers,600); setTimeout(installWrappers,1600); setTimeout(installWrappers,3200);
    if(result.restored){
      try{if(typeof renderAll==='function')renderAll();else{if(typeof renderFinance==='function')renderFinance();if(typeof renderLove==='function')renderLove();}}catch(e){}
      updateStatus('已從 '+result.restored+' 恢復資料；新增或修改會自動永久保存。');
    }else updateStatus('永久保存功能已啟用；新增或修改後會自動保存。');
    setTimeout(function(){const fresh=readLocalMain();if(fresh&&hasUsefulData(fresh))durableSave('startup-sync',fresh);},1800);
    setTimeout(labels,900); setTimeout(labels,2200);
  }

  window.LionsClubPersistence={
    save:function(){const fresh=readLocalMain();return durableSave('manual-api',fresh||undefined);},
    restore:restoreBest,
    loadIdb:loadIdb,
    version:VERSION
  };
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden'){
      const fresh=readLocalMain();
      if(fresh&&hasUsefulData(fresh))durableSave('visibility-hidden',fresh);
    }
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
