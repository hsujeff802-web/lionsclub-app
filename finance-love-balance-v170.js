
(function(){
  'use strict';

  const VERSION='DEV V1.1.70 財務愛心基金結餘確實帶入版';

  function $(id){return document.getElementById(id);}
  function num(v){
    const x=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));
    return Number.isFinite(x)?x:0;
  }
  function fmt(v){
    try{return typeof money==='function'?money(num(v)):num(v).toLocaleString('zh-TW');}
    catch(e){return num(v).toLocaleString('zh-TW');}
  }
  function dateOnly(v){
    const m=String(v||'').match(/\d{4}-\d{2}-\d{2}/);
    return m?m[0]:'';
  }
  function monthValue(){
    const value=($('finMonth')&&$('finMonth').value)||($('loveMonth')&&$('loveMonth').value)||'';
    const m=String(value).match(/^(\d{4})-(\d{1,2})/);
    if(m)return m[1]+'-'+String(Number(m[2])).padStart(2,'0');
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  function monthLastDay(mo){
    const y=Number(mo.slice(0,4)),m=Number(mo.slice(5,7));
    return mo+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0');
  }
  function getDb(){
    if(window.db&&typeof window.db==='object')return window.db;
    try{
      const key=window.STORAGE_KEY||'lionsclub_appstore_v100';
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):{};
    }catch(e){return {};}
  }
  function calculateLoveBalance(mo){
    const data=getDb();
    const end=monthLastDay(mo);
    let balance=num(data.loveOpening);
    const rows=Array.isArray(data.loveFund)?data.loveFund:[];
    rows.forEach(function(row){
      if(!row||row.draft)return;
      const d=dateOnly(row.date);
      if(!d||d>end)return;
      const amount=num(row.amount);
      balance+=String(row.type||'').includes('支')?-amount:amount;
    });
    return balance;
  }
  function headerIndex(table,label){
    const headers=Array.from(table.querySelectorAll('tr')).find(function(r){
      return Array.from(r.cells||[]).some(function(c){return (c.innerText||'').trim()===label;});
    });
    if(!headers)return -1;
    return Array.from(headers.cells||[]).findIndex(function(c){return (c.innerText||'').trim()===label;});
  }
  function setLoveBalanceInTable(table,balance){
    if(!table)return false;
    const amountIndex=headerIndex(table,'金額');
    let changed=false;
    Array.from(table.rows||[]).forEach(function(row){
      const text=(row.innerText||'').replace(/\s+/g,'');
      if(!text.includes('愛心基金'))return;
      const cells=Array.from(row.cells||[]);
      let target=null;
      if(amountIndex>=0&&cells[amountIndex])target=cells[amountIndex];
      else if(cells.length>=5)target=cells[cells.length-2];
      else if(cells.length>=1)target=cells[cells.length-1];
      if(target){
        target.textContent=fmt(balance);
        target.style.fontWeight='700';
        target.setAttribute('data-love-balance-v170','1');
        changed=true;
      }
    });
    return changed;
  }
  function updateFinanceLoveBalance(){
    const mo=monthValue();
    const balance=calculateLoveBalance(mo);
    const financePaper=$('financePaper');
    if(financePaper){
      const tables=financePaper.querySelectorAll(
        'table.finance-excel-summary, table.v165-summary-table, table.summary'
      );
      tables.forEach(function(t){setLoveBalanceInTable(t,balance);});
    }
    const publicBlock=$('publicFinanceBlock');
    if(publicBlock){
      publicBlock.querySelectorAll('table').forEach(function(t){
        setLoveBalanceInTable(t,balance);
      });
    }
    const status=$('v170LoveBalanceStatus');
    if(status)status.textContent='已帶入愛心基金結餘：$'+fmt(balance)+'（計算至 '+mo+' 月底）';
  }
  function addStatus(){
    const paper=$('financePaper');
    if(!paper||$('v170LoveBalanceStatus'))return;
    const actions=paper.querySelector('.a4-entry-actions');
    if(!actions)return;
    const p=document.createElement('div');
    p.id='v170LoveBalanceStatus';
    p.className='notice a4-entry-mini';
    p.textContent='正在計算愛心基金結餘…';
    actions.appendChild(p);
  }
  function refresh(){
    addStatus();
    updateFinanceLoveBalance();
  }

  const originalRenderFinance=window.renderFinance;
  if(typeof originalRenderFinance==='function'){
    window.renderFinance=function(){
      const result=originalRenderFinance.apply(this,arguments);
      setTimeout(refresh,0);
      setTimeout(refresh,120);
      return result;
    };
  }
  const originalRenderFinancePaper=window.renderFinancePaper;
  if(typeof originalRenderFinancePaper==='function'){
    window.renderFinancePaper=function(){
      const result=originalRenderFinancePaper.apply(this,arguments);
      setTimeout(refresh,0);
      return result;
    };
  }
  const originalRenderLove=window.renderLove;
  if(typeof originalRenderLove==='function'){
    window.renderLove=function(){
      const result=originalRenderLove.apply(this,arguments);
      setTimeout(refresh,80);
      return result;
    };
  }
  const originalAddLove=window.addLove;
  if(typeof originalAddLove==='function'){
    window.addLove=function(){
      const result=originalAddLove.apply(this,arguments);
      setTimeout(refresh,150);
      return result;
    };
  }
  const originalSaveLoveGrid=window.saveLoveGrid;
  if(typeof originalSaveLoveGrid==='function'){
    window.saveLoveGrid=function(){
      const result=originalSaveLoveGrid.apply(this,arguments);
      setTimeout(refresh,150);
      return result;
    };
  }
  const originalBuildPublic=window.buildPublicReports;
  if(typeof originalBuildPublic==='function'){
    window.buildPublicReports=function(){
      const result=originalBuildPublic.apply(this,arguments);
      setTimeout(refresh,100);
      return result;
    };
  }

  function bind(){
    ['finMonth','loveMonth'].forEach(function(id){
      const el=$(id);
      if(el&&!el.dataset.v170Bound){
        el.dataset.v170Bound='1';
        el.addEventListener('change',function(){setTimeout(refresh,120);});
      }
    });
    document.addEventListener('click',function(e){
      const btn=e.target&&e.target.closest?e.target.closest('button,[data-page]'):null;
      if(btn)setTimeout(refresh,180);
    },true);
  }
  function labels(){
    try{document.title='龍興會智慧管理系統 '+VERSION;}catch(e){}
    try{
      const small=document.querySelector('.brand small');
      if(small)small.textContent=VERSION+'｜財務報表自動帶入愛心基金結餘';
    }catch(e){}
    try{
      const badge=document.querySelector('.update-badge');
      if(badge)badge.textContent='愛心結餘完成・V1.1.70';
    }catch(e){}
  }
  function boot(){
    bind();
    labels();
    setTimeout(refresh,200);
    setTimeout(refresh,800);
    setTimeout(refresh,1600);
    /* V1.1.71 disabled observer */
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
