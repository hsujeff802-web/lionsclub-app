(function(){
  'use strict';
  const VERSION='V2.0.4 登出備份修正版';
  function $(id){return document.getElementById(id);}
  function pad(v){return String(v).padStart(2,'0');}
  function stamp(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'_'+pad(d.getHours())+'-'+pad(d.getMinutes())+'-'+pad(d.getSeconds());}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function currentData(){if(window.db&&typeof window.db==='object')return clone(window.db);return {};}
  function downloadJson(filename,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}
  async function saveLogoutBackup(){
    const pack={format:'LionsClub-Logout-Backup',appVersion:VERSION,savedAt:new Date().toISOString(),data:currentData()};
    try{if(window.LionsClubPersistence&&typeof window.LionsClubPersistence.save==='function')await window.LionsClubPersistence.save();else if(typeof window.persist==='function')window.persist();}catch(e){console.error(e);}
    // V2.0.2 曾把完整備份再塞一份 localStorage，容易造成 QuotaExceededError；V2.0.4 改成只下載檔案。
    try{downloadJson('龍興獅子會_'+stamp()+'_登出自動備份.json',pack);}catch(e){console.error(e);}
    const status=$('v202LogoutBackupStatus');if(status)status.textContent='最後一次登出備份：'+new Date().toLocaleString('zh-TW');
    return pack;
  }
  const originalLogout=window.logout;
  window.logout=function(){
    const args=arguments;
    saveLogoutBackup().finally(function(){setTimeout(function(){try{if(typeof originalLogout==='function')originalLogout.apply(window,args);else{try{sessionStorage.removeItem(window.AUTH_STORAGE_KEY||'lionsclub_appstore_session_v100');}catch(e){}window.currentRole=null;if(typeof showLogin==='function')showLogin();}}catch(e){console.error(e);}},120);});
  };
  function addStatus(){if($('v202LogoutBackupStatus'))return;const header=document.querySelector('header .session-box, header .session, header');if(!header)return;const span=document.createElement('span');span.id='v202LogoutBackupStatus';span.style.fontSize='12px';span.style.marginLeft='10px';span.style.opacity='0.85';span.textContent='登出時會自動下載備份';header.appendChild(span);}
  function boot(){addStatus();setTimeout(addStatus,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
