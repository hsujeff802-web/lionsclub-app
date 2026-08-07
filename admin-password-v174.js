
(function(){
  'use strict';

  const VERSION='DEV V1.1.74 管理員密碼立即生效修正版';
  const DEFAULT_PASSWORD='1234';

  function $(id){return document.getElementById(id);}
  function getDb(){
    if(window.db&&typeof window.db==='object')return window.db;
    try{
      const key=window.STORAGE_KEY||'lionsclub_appstore_v100';
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):{};
    }catch(e){return {};}
  }
  function saveDb(data){
    try{
      const key=window.STORAGE_KEY||'lionsclub_appstore_v100';
      localStorage.setItem(key,JSON.stringify(data));
      window.db=data;
      if(typeof persist==='function')persist();
      return true;
    }catch(e){
      console.error(e);
      return false;
    }
  }
  function ensureAdmin(){
    const data=getDb();
    data.settings=data.settings||{};
    data.settings.roles=Array.isArray(data.settings.roles)?data.settings.roles:[];
    let admin=data.settings.roles.find(function(r){return r&&r.id==='admin';});
    if(!admin){
      admin={id:'admin',name:'管理員',password:DEFAULT_PASSWORD,readOnly:false,permissions:['*']};
      data.settings.roles.unshift(admin);
    }
    if(!String(admin.password||'').trim())admin.password=DEFAULT_PASSWORD;
    saveDb(data);
    return admin;
  }
  function adminPassword(){
    return String(ensureAdmin().password||DEFAULT_PASSWORD);
  }
  function adminRole(){
    const a=ensureAdmin();
    return {
      id:'admin',
      name:a.name||'管理員',
      password:a.password||DEFAULT_PASSWORD,
      readOnly:false,
      permissions:['*']
    };
  }

  window.login=function(){
    const input=$('loginPassword');
    const password=input?input.value:'';
    const correct=adminPassword();

    if(password!==correct){
      if($('loginError'))$('loginError').textContent='管理員密碼不正確。';
      return;
    }

    window.currentRole=adminRole();
    try{sessionStorage.setItem(window.AUTH_STORAGE_KEY||'lionsclub_appstore_session_v100','admin');}catch(e){}
    if($('loginError'))$('loginError').textContent='';
    if(input)input.value='';
    if($('loginOverlay'))$('loginOverlay').classList.add('hidden');
    try{if(typeof applyPermissions==='function')applyPermissions();}catch(e){}
  };

  window.initAccess=function(){
    let id='';
    try{id=sessionStorage.getItem(window.AUTH_STORAGE_KEY||'lionsclub_appstore_session_v100')||'';}catch(e){}
    if(id==='admin'){
      window.currentRole=adminRole();
      if($('loginOverlay'))$('loginOverlay').classList.add('hidden');
    }else{
      window.currentRole=null;
      try{if(typeof showLogin==='function')showLogin();}catch(e){}
    }
    try{if(typeof applyPermissions==='function')applyPermissions();}catch(e){}
  };

  window.saveAdminPassword116=function(){
    try{
      if(typeof isAdmin==='function'&&!isAdmin())return alert('只有管理員可以修改管理員密碼。');

      const oldPwd=$('adminPwdOld')?$('adminPwdOld').value:'';
      const newPwd=$('adminPwdNew')?$('adminPwdNew').value:'';
      const confirmPwd=$('adminPwdNew2')?$('adminPwdNew2').value:'';
      const current=adminPassword();

      if(oldPwd!==current)return alert('原管理員密碼不正確。');
      if(newPwd.length<4)return alert('新密碼至少需要4碼。');
      if(newPwd!==confirmPwd)return alert('兩次輸入的新密碼不一樣。');

      const data=getDb();
      data.settings=data.settings||{};
      data.settings.roles=Array.isArray(data.settings.roles)?data.settings.roles:[];
      let admin=data.settings.roles.find(function(r){return r&&r.id==='admin';});
      if(!admin){
        admin={id:'admin',name:'管理員',readOnly:false,permissions:['*']};
        data.settings.roles.unshift(admin);
      }
      admin.password=newPwd;

      if(!saveDb(data))return alert('密碼儲存失敗。');

      window.currentRole=adminRole();
      ['adminPwdOld','adminPwdNew','adminPwdNew2'].forEach(function(id){
        if($(id))$(id).value='';
      });

      try{
        if(typeof renderLoginRoles==='function')renderLoginRoles();
        if(typeof renderRoleManager==='function')renderRoleManager();
      }catch(e){}

      alert('管理員密碼已更新。下次登入請使用新密碼，原本的1234已失效。');
    }catch(e){
      console.error(e);
      alert('管理員密碼修改失敗。');
    }
  };

  window.resetAccessRoles=function(){
    if(!confirm('確定要把管理員密碼恢復成1234嗎？'))return;

    const data=getDb();
    data.settings=data.settings||{};
    data.settings.roles=Array.isArray(data.settings.roles)?data.settings.roles:[];
    let admin=data.settings.roles.find(function(r){return r&&r.id==='admin';});
    if(!admin){
      admin={id:'admin',name:'管理員',readOnly:false,permissions:['*']};
      data.settings.roles.unshift(admin);
    }
    admin.password=DEFAULT_PASSWORD;
    saveDb(data);

    window.currentRole=null;
    try{sessionStorage.removeItem(window.AUTH_STORAGE_KEY||'lionsclub_appstore_session_v100');}catch(e){}
    if($('loginPassword'))$('loginPassword').value='';
    if($('loginError'))$('loginError').textContent='管理員密碼已恢復為1234。';
    if($('loginOverlay'))$('loginOverlay').classList.remove('hidden');
    try{if(typeof applyPermissions==='function')applyPermissions();}catch(e){}
  };

  function fixLoginText(){
    const overlay=$('loginOverlay');
    if(!overlay)return;
    overlay.querySelectorAll('.notice').forEach(function(p){
      if((p.textContent||'').includes('預設管理員密碼')){
        p.textContent='第一次使用的預設管理員密碼為1234；修改後請使用新密碼登入。';
      }
    });
    const resetBtn=Array.from(overlay.querySelectorAll('button')).find(function(b){
      return (b.textContent||'').includes('恢復 1234');
    });
    if(resetBtn)resetBtn.textContent='忘記密碼／恢復1234';
  }

  function labels(){
    try{document.title='龍興會智慧管理系統 '+VERSION;}catch(e){}
    try{
      const small=document.querySelector('.brand small');
      if(small)small.textContent=VERSION+'｜新密碼儲存後立即取代1234';
    }catch(e){}
    try{
      const badge=document.querySelector('.update-badge');
      if(badge)badge.textContent='密碼修正・V1.1.74';
    }catch(e){}
  }

  function boot(){
    ensureAdmin();
    fixLoginText();
    labels();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
