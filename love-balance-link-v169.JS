
(function(){
  'use strict';

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
    try{ return num(window.db && db.loveOpening); }
    catch(e){ return 0; }
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
        if(String(x.type || '').includes('支')) balance -= amount;
        else balance += amount;
      });
    }catch(e){}
    return balance;
  }

  function fiscalStartYear(){
    const lm = normalizeMonth(($('loveMonth') && $('loveMonth').value) || '');
    if(lm){
      const y = Number(lm.slice(0,4));
      const m = Number(lm.slice(5,7));
      return m >= 7 ? y : y - 1;
    }
    return new Date().getFullYear();
  }

  function loveMonthTotals(mo){
    mo = normalizeMonth(mo);
    let income = 0, expense = 0;
    try{
      const rows = (window.db && Array.isArray(db.loveFund)) ? db.loveFund : [];
      rows.forEach(function(x){
        if(!x || x.draft) return;
        const d = ymd(x.date);
        if(!d || d.slice(0,7) !== mo) return;
        const amount = num(x.amount);
        if(String(x.type || '').includes('支')) expense += amount;
        else income += amount;
      });
    }catch(e){}
    return {income, expense};
  }

  function updateLoveAnnualTable(){
    try{
      const tables = Array.from(document.querySelectorAll('table'));
      const table = tables.find(function(t){
        const text = (t.innerText || '').replace(/\s+/g,'');
        return text.includes('前年度結餘') &&
               text.includes('全年度') &&
               text.includes('本月收入') &&
               text.includes('本月支出');
      });
      if(!table) return;

      const startYear = fiscalStartYear();
      const opening = getLoveOpening();
      let running = opening;
      let yearIncome = 0;
      let yearExpense = 0;

      const rows = Array.from(table.rows || []);
      const months = [7,8,9,10,11,12,1,2,3,4,5,6];

      rows.forEach(function(row){
        const cells = Array.from(row.cells || []);
        if(cells.length >= 4 &&
           String(cells[0].innerText || '').trim() === '前年度結餘'){
          cells[3].textContent = moneyText(opening);
        }
      });

      months.forEach(function(monthNo){
        const year = monthNo >= 7 ? startYear : startYear + 1;
        const mo = year + '-' + String(monthNo).padStart(2,'0');
        const t = loveMonthTotals(mo);

        running += t.income - t.expense;
        yearIncome += t.income;
        yearExpense += t.expense;

        const row = rows.find(function(r){
          const c = r.cells && r.cells[0];
          return c && String(c.innerText || '').trim() === monthNo + '月';
        });
        if(row && row.cells.length >= 4){
          row.cells[1].textContent = moneyText(t.income);
          row.cells[2].textContent = moneyText(t.expense);
          row.cells[3].textContent = moneyText(running);
        }
      });

      const annualRow = rows.find(function(r){
        const c = r.cells && r.cells[0];
        return c && String(c.innerText || '').trim() === '全年度';
      });
      if(annualRow && annualRow.cells.length >= 4){
        annualRow.cells[1].textContent = moneyText(yearIncome);
        annualRow.cells[2].textContent = moneyText(yearExpense);
        annualRow.cells[3].textContent = moneyText(running);
      }
    }catch(e){
      console.error('Love annual summary fix failed', e);
    }
  }

  function updateFinanceLoveBalance(){
    try{
      const paper = $('financePaper');
      if(!paper) return;
      const mo = normalizeMonth(($('finMonth') && $('finMonth').value) || '');
      if(!mo) return;
      const balance = loveBalanceForMonth(mo);

      Array.from(paper.querySelectorAll('tr')).forEach(function(row){
        const text = (row.innerText || '').replace(/\s+/g,'');
        if(!text.includes('愛心基金')) return;
        const cells = Array.from(row.cells || []);
        if(cells.length >= 5){
          cells[cells.length - 2].textContent = moneyText(balance);
        }
      });
    }catch(e){}
  }

  function refreshAll(){
    updateLoveAnnualTable();
    updateFinanceLoveBalance();
  }

  function wrap(name, delay){
    const old = window[name];
    if(typeof old !== 'function' || old.__loveAnnualWrapped) return;
    const fn = function(){
      const r = old.apply(this, arguments);
      setTimeout(refreshAll, delay || 100);
      setTimeout(refreshAll, (delay || 100) + 150);
      return r;
    };
    fn.__loveAnnualWrapped = true;
    window[name] = fn;
  }

  function bind(){
    ['renderLove','saveLoveGrid','addLove','renderFinance','renderFinancePaper']
      .forEach(function(n){ wrap(n, 120); });

    const lm = $('loveMonth');
    if(lm && !lm.dataset.loveAnnualFix){
      lm.dataset.loveAnnualFix='1';
      lm.addEventListener('change', function(){
        setTimeout(refreshAll,120);
      });
    }

    setTimeout(refreshAll,200);
    setTimeout(refreshAll,800);
    setTimeout(refreshAll,1500);

    const root = document.body;
    if(root && !root.dataset.loveAnnualObserver){
      root.dataset.loveAnnualObserver='1';
      new MutationObserver(function(){
        setTimeout(updateLoveAnnualTable,80);
      }).observe(root,{childList:true,subtree:true});
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  }else{
    bind();
  }
})();
