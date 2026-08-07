
(function(){
  'use strict';

  const VERSION='DEV V1.1.69 財務愛心基金結餘連動版';

  function $(id){ return document.getElementById(id); }
  function num(v){
    const x = Number(String(v == null ? '' : v).replace(/[^0-9.-]/g,''));
    return Number.isFinite(x) ? x : 0;
  }
  function moneyText(v){
    try{
      return typeof money === 'function' ? money(num(v)) : num(v).toLocaleString('zh-TW');
    }catch(e){
      return num(v).toLocaleString('zh-TW');
    }
  }
  function ymd(v){
    const m = String(v || '').match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : '';
  }
  function normalizeMonth(v){
    const m = String(v || '').match(/^(\d{4})-(\d{1,2})/);
    return m ? m[1] + '-' + String(Number(m[2])).padStart(2,'0') : '';
  }
  function monthEnd(mo){
    mo = normalizeMonth(mo);
    if(!mo) return '';
    const y = Number(mo.slice(0,4));
    const m = Number(mo.slice(5,7));
    return mo + '-' + String(new Date(y,m,0).getDate()).padStart(2,'0');
  }

  function getLoveOpening(){
    try{
      return num(window.db && db.loveOpening);
    }catch(e){
      return 0;
    }
  }

  function loveBalanceForMonth(mo){
    mo = normalizeMonth(mo);
    const end = monthEnd(mo);
    let balance = getLoveOpening();

    try{
      const rows = (window.db && Array.isArray(db.loveFund)) ? db.loveFund : [];
      rows.forEach(function(x){
        if(!x || x.draft) return;
        const d = ymd(x.date);
        if(!d || (end && d > end)) return;

        const amount = num(x.amount);
        if(String(x.type || '').includes('支')){
          balance -= amount;
        }else{
          balance += amount;
        }
      });
    }catch(e){
      console.error('V1.1.69 love balance calculation failed', e);
    }

    return balance;
  }

  function findFinanceSummaryTable(){
    const paper = $('financePaper');
    if(!paper) return null;
    return paper.querySelector(
      'table.finance-excel-summary, table.v165-summary-table, table.summary'
    );
  }

  function updateSummaryLoveRow(){
    const table = findFinanceSummaryTable();
    if(!table) return;

    const mo = normalizeMonth(($('finMonth') && $('finMonth').value) || '');
    if(!mo) return;

    const balance = loveBalanceForMonth(mo);
    const rows = Array.from(table.rows || []);
    let found = false;

    rows.forEach(function(row){
      const text = (row.innerText || '').replace(/\s+/g,'');
      if(!text.includes('愛心基金')) return;

      const cells = Array.from(row.cells || []);
      if(!cells.length) return;

      let target = null;

      // 五欄摘要表：項目、摘要、明細、金額、備註
      if(cells.length >= 5){
        target = cells[cells.length - 2];
      }else{
        // 舊版摘要表，從右邊找最合適的金額欄
        target = cells[cells.length - 1];
      }

      if(target){
        target.textContent = moneyText(balance);
        target.setAttribute('data-love-balance-linked','1');
        found = true;
      }
    });

    // 如果摘要表沒有愛心基金這一列，就新增一列
    if(!found){
      const tbody = table.tBodies && table.tBodies[0] ? table.tBodies[0] : table;
      const row = document.createElement('tr');

      if(table.querySelector('thead tr') && table.querySelector('thead tr').cells.length >= 5){
        row.innerHTML =
          '<td>6</td>' +
          '<td><b>資金明細</b></td>' +
          '<td>愛心基金結餘</td>' +
          '<td data-love-balance-linked="1">' + moneyText(balance) + '</td>' +
          '<td></td>';
      }else{
        row.innerHTML =
          '<td></td><td></td><td>愛心基金結餘</td>' +
          '<td></td><td></td>' +
          '<td data-love-balance-linked="1">' + moneyText(balance) + '</td>' +
          '<td></td>';
      }

      tbody.appendChild(row);
    }
  }

  function updatePublicFinance(){
    try{
      const block = $('publicFinanceBlock');
      if(!block) return;
      const mo = normalizeMonth(($('finMonth') && $('finMonth').value) || '');
      const balance = loveBalanceForMonth(mo);

      Array.from(block.querySelectorAll('tr')).forEach(function(row){
        const text = (row.innerText || '').replace(/\s+/g,'');
        if(!text.includes('愛心基金')) return;
        const cells = Array.from(row.cells || []);
        if(cells.length >= 5){
          cells[cells.length - 2].textContent = moneyText(balance);
        }else if(cells.length){
          cells[cells.length - 1].textContent = moneyText(balance);
        }
      });
    }catch(e){
      console.error(e);
    }
  }

  function refreshLinkedLoveBalance(){
    updateSummaryLoveRow();
    updatePublicFinance();
  }

  const oldRenderFinance = window.renderFinance;
  if(typeof oldRenderFinance === 'function'){
    window.renderFinance = function(){
      const result = oldRenderFinance.apply(this, arguments);
      setTimeout(refreshLinkedLoveBalance, 0);
      setTimeout(refreshLinkedLoveBalance, 120);
      return result;
    };
  }

  const oldRenderFinancePaper = window.renderFinancePaper;
  if(typeof oldRenderFinancePaper === 'function'){
    window.renderFinancePaper = function(){
      const result = oldRenderFinancePaper.apply(this, arguments);
      setTimeout(refreshLinkedLoveBalance, 0);
      return result;
    };
  }

  const oldRenderLove = window.renderLove;
  if(typeof oldRenderLove === 'function'){
    window.renderLove = function(){
      const result = oldRenderLove.apply(this, arguments);
      setTimeout(refreshLinkedLoveBalance, 80);
      return result;
    };
  }

  const oldSaveLoveGrid = window.saveLoveGrid;
  if(typeof oldSaveLoveGrid === 'function'){
    window.saveLoveGrid = function(){
      const result = oldSaveLoveGrid.apply(this, arguments);
      setTimeout(refreshLinkedLoveBalance, 120);
      return result;
    };
  }

  const oldAddLove = window.addLove;
  if(typeof oldAddLove === 'function'){
    window.addLove = function(){
      const result = oldAddLove.apply(this, arguments);
      setTimeout(refreshLinkedLoveBalance, 120);
      return result;
    };
  }

  const oldBuildPublicReports = window.buildPublicReports;
  if(typeof oldBuildPublicReports === 'function'){
    window.buildPublicReports = function(){
      const result = oldBuildPublicReports.apply(this, arguments);
      setTimeout(updatePublicFinance, 80);
      return result;
    };
  }

  function bindMonth(){
    const fm = $('finMonth');
    if(fm && !fm.dataset.v169Bound){
      fm.dataset.v169Bound = '1';
      fm.addEventListener('change', function(){
        setTimeout(refreshLinkedLoveBalance, 120);
      });
    }

    const lm = $('loveMonth');
    if(lm && !lm.dataset.v169Bound){
      lm.dataset.v169Bound = '1';
      lm.addEventListener('change', function(){
        setTimeout(refreshLinkedLoveBalance, 120);
      });
    }
  }

  function labels(){
    try{
      document.title='龍興會智慧管理系統 ' + VERSION;
    }catch(e){}

    try{
      const small=document.querySelector('.brand small');
      if(small) small.textContent=VERSION + '｜財務自動帶入愛心基金結餘';
    }catch(e){}

    try{
      const badge=document.querySelector('.update-badge');
      if(badge) badge.textContent='愛心結餘連動・V1.1.69';
    }catch(e){}
  }

  function boot(){
    bindMonth();
    labels();

    setTimeout(refreshLinkedLoveBalance, 200);
    setTimeout(refreshLinkedLoveBalance, 800);
    setTimeout(refreshLinkedLoveBalance, 1500);

    const financePaper = $('financePaper');
    if(financePaper){
      new MutationObserver(function(){
        setTimeout(refreshLinkedLoveBalance, 0);
      }).observe(financePaper, {childList:true, subtree:true});
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
