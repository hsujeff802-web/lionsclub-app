
(function(){
  'use strict';
  const VERSION='DEV V1.1.72 修改財務報表按鈕版';

  function $(id){return document.getElementById(id);}

  function enableFinanceEditing(){
    const paper=$('financePaper');
    if(!paper)return;
    paper.querySelectorAll('input,select,textarea').forEach(function(el){
      if(el.closest('.no-print'))return;
      el.disabled=false;
      el.readOnly=false;
    });
    paper.querySelectorAll('.finance-ledger-row').forEach(function(row){
      row.classList.add('v172-editing-row');
    });
  }

  window.modifyFinanceReportV172=function(){
    try{
      if(typeof guardEdit==='function'&&!guardEdit('finance'))return;
      if(typeof go==='function')go('finance');
      if(typeof renderFinance==='function')renderFinance();

      setTimeout(function(){
        enableFinanceEditing();

        const paper=$('financePaper');
        if(paper){
          paper.scrollIntoView({behavior:'smooth',block:'start'});
        }

        const first=
          document.querySelector('#financePaper [data-ledger-field="date"]') ||
          document.querySelector('#financePaper [data-ledger-field="item"]') ||
          document.querySelector('#financePaper input');

        if(first){
          first.focus();
          if(first.select)first.select();
        }

        const notice=$('financeDraftNotice');
        if(notice){
          notice.textContent='修改模式：請直接修改日期、明細、收入、支出或備註，完成後按「儲存表格」。';
          notice.classList.add('show');
        }
      },180);
    }catch(e){
      console.error('V1.1.72 modify finance',e);
      alert('無法開啟修改模式，請重新整理後再試一次。');
    }
  };

  function addButton(){
    if($('v172ModifyFinanceBtn'))return;

    const newBtn=$('v145FinanceNewBtn') ||
      Array.from(document.querySelectorAll('button')).find(function(b){
        return (b.textContent||'').trim()==='新增財務報表';
      });

    if(!newBtn)return;

    const btn=document.createElement('button');
    btn.id='v172ModifyFinanceBtn';
    btn.type='button';
    btn.className='soft no-print';
    btn.textContent='修改財務報表';
    btn.onclick=window.modifyFinanceReportV172;

    newBtn.insertAdjacentElement('afterend',btn);
  }

  function labels(){
    try{document.title='龍興會智慧管理系統 '+VERSION;}catch(e){}
    try{
      const small=document.querySelector('.brand small');
      if(small)small.textContent=VERSION+'｜新增與修改財務報表分開操作';
    }catch(e){}
    try{
      const badge=document.querySelector('.update-badge');
      if(badge)badge.textContent='修改按鈕・V1.1.72';
    }catch(e){}
  }

  function boot(){
    labels();
    addButton();
    setTimeout(addButton,400);
    setTimeout(addButton,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
