
(function(){
'use strict';
const VERSION='V2.0.0 核心第一階段測試版';
function $(id){return document.getElementById(id)}
function num(v){const x=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0}
function fmt(v){try{return typeof money==='function'?money(num(v)):num(v).toLocaleString('zh-TW')}catch(e){return num(v).toLocaleString('zh-TW')}}
function ymd(v){const m=String(v||'').match(/\d{4}-\d{2}-\d{2}/);return m?m[0]:''}
function normMonth(v){const m=String(v||'').match(/^(\d{4})-(\d{1,2})/);return m?m[1]+'-'+String(Number(m[2])).padStart(2,'0'):''}
function monthEnd(mo){mo=normMonth(mo);if(!mo)return'';const y=Number(mo.slice(0,4)),m=Number(mo.slice(5,7));return mo+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0')}
function getDb(){if(window.db&&typeof window.db==='object')return window.db;try{const raw=localStorage.getItem(window.STORAGE_KEY||'lionsclub_appstore_v100');return raw?JSON.parse(raw):{}}catch(e){return{}}}
function balance(list,opening,mo){const end=monthEnd(mo);let total=num(opening);(Array.isArray(list)?list:[]).forEach(x=>{if(!x||x.draft)return;const d=ymd(x.date);if(!d||d>end)return;total+=String(x.type||'').includes('支')?-num(x.amount):num(x.amount)});return total}
function headerIndex(table,label){for(const row of Array.from(table.rows||[])){const i=Array.from(row.cells||[]).findIndex(c=>(c.innerText||'').trim()===label);if(i>=0)return i}return-1}
function setRow(table,label,value){const idx=headerIndex(table,'金額');Array.from(table.rows||[]).forEach(row=>{const text=(row.innerText||'').replace(/\s+/g,'');if(!text.includes(label))return;const cells=Array.from(row.cells||[]);const target=(idx>=0&&cells[idx])?cells[idx]:(cells.length>=5?cells[cells.length-2]:cells[cells.length-1]);if(target)target.textContent=fmt(value)})}
function refresh(){const paper=$('financePaper'),mo=normMonth(($('finMonth')&&$('finMonth').value)||'');if(!paper||!mo)return;const d=getDb(),fin=balance(d.finance,d.financeOpening,mo),love=balance(d.loveFund,d.loveOpening,mo);paper.querySelectorAll('table.finance-excel-summary,table.v165-summary-table,table.summary').forEach(t=>{setRow(t,'愛心基金',love);setRow(t,'現金餘額',fin);setRow(t,'現金結餘',fin)});const status=$('v200Status');if(status)status.textContent='本月結轉完成：現金餘額 $'+fmt(fin)+'｜愛心基金 $'+fmt(love)}
function addStatus(){const paper=$('financePaper');if(!paper||$('v200Status'))return;const actions=paper.querySelector('.a4-entry-actions');if(!actions)return;const p=document.createElement('div');p.id='v200Status';p.className='notice a4-entry-mini';p.textContent='正在計算本月結轉…';actions.appendChild(p)}
function run(){addStatus();refresh()}
['renderFinance','renderFinancePaper','renderLove','saveLoveGrid','saveFinanceGrid'].forEach(name=>{const old=window[name];if(typeof old==='function')window[name]=function(){const r=old.apply(this,arguments);setTimeout(run,100);return r}})
function boot(){try{document.title='龍興會智慧管理系統 '+VERSION}catch(e){};['finMonth','loveMonth'].forEach(id=>{const el=$(id);if(el&&!el.dataset.v200Bound){el.dataset.v200Bound='1';el.addEventListener('change',()=>setTimeout(run,120))}});setTimeout(run,250);setTimeout(run,900)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
