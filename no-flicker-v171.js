(function(){
'use strict';
const VERSION='DEV V1.1.71 愛心基金金額不閃爍修正版';
let updating=false,timer=null;
function $(id){return document.getElementById(id)}
function num(v){const x=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0}
function fmt(v){try{return typeof money==='function'?money(num(v)):num(v).toLocaleString('zh-TW')}catch(e){return num(v).toLocaleString('zh-TW')}}
function dateOnly(v){const m=String(v||'').match(/\d{4}-\d{2}-\d{2}/);return m?m[0]:''}
function monthValue(){const v=($('finMonth')&&$('finMonth').value)||'';const m=String(v).match(/^(\d{4})-(\d{1,2})/);if(m)return m[1]+'-'+String(Number(m[2])).padStart(2,'0');const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function monthEnd(mo){const y=Number(mo.slice(0,4)),m=Number(mo.slice(5,7));return mo+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0')}
function dataDb(){if(window.db&&typeof window.db==='object')return window.db;try{const key=window.STORAGE_KEY||'lionsclub_appstore_v100';const raw=localStorage.getItem(key);return raw?JSON.parse(raw):{}}catch(e){return {}}}
function loveBalance(mo){const data=dataDb(),end=monthEnd(mo);let total=num(data.loveOpening);const rows=Array.isArray(data.loveFund)?data.loveFund:[];rows.forEach(function(row){if(!row||row.draft)return;const d=dateOnly(row.date);if(!d||d>end)return;total+=String(row.type||'').includes('支')?-num(row.amount):num(row.amount)});return total}
function amountColumnIndex(table){const rows=Array.from(table.rows||[]);for(const row of rows){const cells=Array.from(row.cells||[]),i=cells.findIndex(c=>(c.innerText||'').trim()==='金額');if(i>=0)return i}return -1}
function applyOnce(){if(updating)return;updating=true;try{const mo=monthValue(),value=fmt(loveBalance(mo)),paper=$('financePaper');if(!paper)return;const tables=paper.querySelectorAll('table.finance-excel-summary,table.v165-summary-table,table.summary');tables.forEach(function(table){const idx=amountColumnIndex(table);Array.from(table.rows||[]).forEach(function(row){const text=(row.innerText||'').replace(/\s+/g,'');if(!text.includes('愛心基金'))return;const cells=Array.from(row.cells||[]);const target=(idx>=0&&cells[idx])?cells[idx]:(cells.length>=5?cells[cells.length-2]:cells[cells.length-1]);if(target&&target.textContent.trim()!==value){target.textContent=value;target.style.fontWeight='700'}})});const status=$('v170LoveBalanceStatus'),statusText='已帶入愛心基金結餘：$'+value+'（計算至 '+mo+' 月底）';if(status&&status.textContent!==statusText)status.textContent=statusText}finally{updating=false}}
function schedule(){clearTimeout(timer);timer=setTimeout(applyOnce,80)}
const oldRenderFinance=window.renderFinance;if(typeof oldRenderFinance==='function')window.renderFinance=function(){const r=oldRenderFinance.apply(this,arguments);schedule();return r};
const oldRenderFinancePaper=window.renderFinancePaper;if(typeof oldRenderFinancePaper==='function')window.renderFinancePaper=function(){const r=oldRenderFinancePaper.apply(this,arguments);schedule();return r};
const oldRenderLove=window.renderLove;if(typeof oldRenderLove==='function')window.renderLove=function(){const r=oldRenderLove.apply(this,arguments);schedule();return r};
const oldAddLove=window.addLove;if(typeof oldAddLove==='function')window.addLove=function(){const r=oldAddLove.apply(this,arguments);setTimeout(schedule,120);return r};
const oldSaveLoveGrid=window.saveLoveGrid;if(typeof oldSaveLoveGrid==='function')window.saveLoveGrid=function(){const r=oldSaveLoveGrid.apply(this,arguments);setTimeout(schedule,120);return r};
function bind(){['finMonth','loveMonth'].forEach(function(id){const el=$(id);if(el&&!el.dataset.v171Bound){el.dataset.v171Bound='1';el.addEventListener('change',schedule)}})}
function labels(){try{document.title='龍興會智慧管理系統 '+VERSION}catch(e){}try{const small=document.querySelector('.brand small');if(small)small.textContent=VERSION+'｜愛心基金金額固定顯示不閃爍'}catch(e){}try{const badge=document.querySelector('.update-badge');if(badge)badge.textContent='不閃爍・V1.1.71'}catch(e){}}
function boot(){bind();labels();setTimeout(schedule,200);setTimeout(schedule,800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();