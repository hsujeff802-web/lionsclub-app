
(function(){
  'use strict';

  const VERSION='V2.0.2 登出自動備份版';
  const LOGOUT_BACKUP_KEY='lionsclub_logout_backup_v202';

  function $(id){return document.getElementById(id);}
  function pad(v){return String(v).padStart(2,'0');}
  function stamp(){
    const d=new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'_'+pad(d.getHours())+'-'+pad(d.getMinutes())+'-'+pad(d.getSeconds());
  }
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
    }catch(e){
      return {};
    }
  }
  function downloadJson(filename,obj){
    const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
  }
  function saveLogoutBackup(){
    const pack={
      format:'LionsClub-Logout-Backup',
      appVersion:VERSION,
      savedAt:new Date().toISOString(),
      data:currentData()
    };

    try{
      localStorage.setItem(LOGOUT_BACKUP_KEY,JSON.stringify(pack));
      localStorage.setItem(appKey(),JSON.stringify(pack.data));
    }catch(e){
      console.error(e);
    }

    try{
      downloadJson('龍興獅子會_'+stamp()+'_登出自動備份.json',pack);
    }catch(e){
      console.error(e);
    }

    const status=$('v202LogoutBackupStatus');
    if(status)status.textContent='最後一次登出備份：'+new Date().toLocaleString('zh-TW');

    return pack;
  }

  const originalLogout=window.logout;
  window.logout=function(){
    try{
      saveLogoutBackup();
    }catch(e){
      console.error(e);
    }

    setTimeout(function(){
      try{
        if(typeof originalLogout==='function'){
          originalLogout.apply(window,arguments);
        }else{
          try{sessionStorage.removeItem(window.AUTH_STORAGE_KEY||'lionsclub_appstore_session_v100');}catch(e){}
          window.currentRole=null;
          if(typeof showLogin==='function')showLogin();
        }
      }catch(e){
        console.error(e);
      }
    },150);
  };

  function addStatus(){
    if($('v202LogoutBackupStatus'))return;

    const header=document.querySelector('header .session-box, header .session, header');
    if(!header)return;

    const span=document.createElement('span');
    span.id='v202LogoutBackupStatus';
    span.style.fontSize='12px';
    span.style.marginLeft='10px';
    span.style.opacity='0.85';
    span.textContent='登出時會自動下載備份';

    header.appendChild(span);
  }

  function labels(){
    try{document.title='龍興會智慧管理系統 '+VERSION;}catch(e){}
    try{
      const small=document.querySelector('.brand small');
      if(small)small.textContent=VERSION+'｜登出時自動保存並下載備份';
    }catch(e){}
    try{
      const badge=document.querySelector('.update-badge');
      if(badge)badge.textContent='登出備份・V2.0.2';
    }catch(e){}
  }

  function boot(){
    labels();
    addStatus();
    setTimeout(addStatus,500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
