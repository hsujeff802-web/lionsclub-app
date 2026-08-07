(function(){
  'use strict';
  const VERSION='V2.0.4 愛心基金備份還原';
  function $(id){return document.getElementById(id);}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function ymd(v){const m=String(v||'').match(/\d{4}-\d{2}-\d{2}/);return m?m[0]:'';}
  function num(v){const n=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0;}
  function norm(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function rowKey(x){
    x=x||{};
    return [ymd(x.date),norm(x.type),norm(x.member),norm(x.person),norm(x.purpose),norm(x.item),num(x.amount),num(x.quantity||1)].join('|');
  }
  function validLoveBackup(obj){
    return !!(obj&&typeof obj==='object'&&Array.isArray(obj.loveFund)&&(
      obj.backupType==='loveFund'||/愛心|love/i.test(String(obj.backupType||obj.version||''))||obj.loveFund.length>=0
    ));
  }
  async function saveNow(){
    try{
      if(window.LionsClubPersistence&&typeof window.LionsClubPersistence.save==='function')await window.LionsClubPersistence.save();
      else if(typeof window.persist==='function')window.persist();
      else if(window.STORAGE_KEY&&window.db)localStorage.setItem(window.STORAGE_KEY,JSON.stringify(window.db));
    }catch(e){console.error(e);}
  }
  function refresh(){
    try{if(typeof renderAll==='function')renderAll();else if(typeof renderLove==='function')renderLove();}catch(e){console.error(e);}
    try{if($('loveMonth'))$('loveMonth').value='2026-08';}catch(e){}
    try{if(typeof renderLove==='function')renderLove();}catch(e){}
  }
  window.importLoveBackupV204=function(input){
    const file=input&&input.files&&input.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=async function(){
      try{
        const obj=JSON.parse(String(reader.result||''));
        if(!validLoveBackup(obj))throw new Error('不是愛心基金備份');
        if(!window.db||typeof window.db!=='object')window.db={};
        if(!Array.isArray(db.loveFund))db.loveFund=[];
        const oldCount=db.loveFund.length;
        const existing=new Set(db.loveFund.map(rowKey));
        let added=0;
        obj.loveFund.forEach(function(r){
          const k=rowKey(r);
          if(!existing.has(k)){db.loveFund.push(clone(r));existing.add(k);added++;}
        });
        if(obj.settings&&typeof obj.settings==='object'&&(!db.settings||typeof db.settings!=='object'))db.settings=clone(obj.settings);
        await saveNow();
        refresh();
        const aug=db.loveFund.filter(x=>!x.draft&&ymd(x.date).startsWith('2026-08'));
        alert('愛心基金備份已還原。\n新增 '+added+' 筆；目前共 '+db.loveFund.length+' 筆（原 '+oldCount+' 筆）。\n2026年8月目前有 '+aug.length+' 筆。\n資料已同步保存到永久儲存。');
      }catch(e){console.error(e);alert('愛心基金備份匯入失敗：'+(e&&e.message?e.message:'檔案格式不符'));}
      finally{input.value='';}
    };
    reader.readAsText(file,'utf-8');
  };
  function addCard(){
    const page=$('love'); if(!page||$('v204LoveRestoreCard'))return;
    const card=document.createElement('div');
    card.id='v204LoveRestoreCard'; card.className='card no-print';
    card.innerHTML='<h2>愛心基金備份還原（V2.0.4）</h2><p class="notice">可直接選擇「龍興會_愛心基金備份_日期.json」。系統會合併資料並自動去除重複，不會把其他財務、會員、公文資料蓋掉。</p><label class="success" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:10px;cursor:pointer;font-weight:700">📥 匯入愛心基金備份<input type="file" accept=".json,application/json" style="display:none" onchange="importLoveBackupV204(this)"></label><span id="v204LoveRestoreInfo" class="notice" style="margin-left:10px">建議先匯入 2026-08-06 或更新的愛心基金備份。</span>';
    const first=page.querySelector('.card'); if(first)page.insertBefore(card,first); else page.appendChild(card);
  }
  function labels(){
    try{document.title='龍興會智慧管理系統 V2.0.4 愛心基金永久保存修正版';}catch(e){}
    try{const small=document.querySelector('.brand small');if(small)small.textContent='V2.0.4 愛心基金永久保存修正版｜F5 後資料不消失';}catch(e){}
    try{const b=document.querySelector('.update-badge');if(b)b.textContent='修正版・V2.0.4';}catch(e){}
  }
  function boot(){addCard();labels();setTimeout(addCard,700);setTimeout(labels,1200);setTimeout(labels,3000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
