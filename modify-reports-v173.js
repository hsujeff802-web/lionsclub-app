
(function(){
  'use strict';
  const VERSION='DEV V1.1.73 財務愛心報表可修改版';

  function $(id){return document.getElementById(id);}

  function unlockInputs(scope){
    if(!scope)return;
    scope.querySelectorAll('input,select,textarea').forEach(function(el){
      if(el.closest('.no-print'))return;
      el.disabled=false;
      el.readOnly=false;
      el.removeAttribute('disabled');
      el.removeAttribute('readonly');
    });
  }

  function focusFirst(scope, selectors){
    for(const sel of selectors){
      const el=scope && scope.querySelector(sel);
      if(el){
        el.focus();
        if(el.select)el.select();
        return;
      }
    }
  }

  window.modifyFinanceReportV173=function(){
    try{
      if(typeof guardEdit==='function'&&!guardEdit('finance'))return;
      if(typeof go==='function')go('finance');
      if(typeof renderFinance==='function')renderFinance();

      setTimeout(function(){
        const paper=$('financePaper');
        unlockInputs(paper);

        if(paper){
          paper.querySelectorAll('.finance-ledger-row').forEach(function(row){
            row.classList.add('v173-editing-row');
          });
          paper.scrollIntoView({behavior:'smooth',block:'start'});
        }

        const notice=$('financeDraftNotice');
        if(notice){
          notice.textContent='財務修改模式：可修改日期、明細、人員、收入、支出及備註；完成後按「儲存表格」。';
          notice.classList.add('show');
        }

        focusFirst(paper,[
          '[data-ledger-field="date"]',
          '[data-ledger-field="item"]',
          '.finance-ledger-input',
          'input'
        ]);
      },180);
    }catch(e){
      console.error(e);
      alert('無法開啟財務修改模式，請重新整理後再試。');
    }
  };

  window.modifyLoveReportV173=function(){
    try{
      if(typeof guardEdit==='function'&&!guardEdit('love'))return;
      if(typeof go==='function')go('love');
      if(typeof renderLove==='function')renderLove();

      setTimeout(function(){
        const paper=$('lovePaper');
        unlockInputs(paper);

        if(paper){
          paper.querySelectorAll('.love-grid-row').forEach(function(row){
            row.classList.add('v173-editing-row');
          });
          paper.scrollIntoView({behavior:'smooth',block:'start'});
        }

        const title=$('loveDetailTitle');
        if(title)title.textContent='愛心基金明細（修改模式）';

        focusFirst(paper,[
          '[data-love-field="date"]',
          '[data-love-field="member"]',
          '[data-love-field="person"]',
          '.love-grid-input',
          'input'
        ]);

        alert('已進入愛心基金修改模式。修改後請按「儲存表格」。');
      },180);
    }catch(e){
      console.error(e);
      alert('無法開啟愛心基金修改模式，請重新整理後再試。');
    }
  };

  function createButton(id,text,handler){
    const btn=document.createElement('button');
    btn.id=id;
    btn.type='button';
    btn.className='soft no-print';
    btn.textContent=text;
    btn.onclick=handler;
    return btn;
  }

  function addFinanceButton(){
    if($('v173ModifyFinanceBtn'))return;

    const old=$('v172ModifyFinanceBtn');
    if(old){
      old.id='v173ModifyFinanceBtn';
      old.textContent='修改財務報表';
      old.onclick=window.modifyFinanceReportV173;
      return;
    }

    const newBtn=$('v145FinanceNewBtn') ||
      Array.from(document.querySelectorAll('button')).find(function(b){
        return (b.textContent||'').trim()==='新增財務報表';
      });

    if(newBtn){
      newBtn.insertAdjacentElement(
        'afterend',
        createButton('v173ModifyFinanceBtn','修改財務報表',window.modifyFinanceReportV173)
      );
    }
  }

  function addLoveButton(){
    if($('v173ModifyLoveBtn'))return;

    const newBtn=
      Array.from(document.querySelectorAll('button')).find(function(b){
        return (b.textContent||'').trim()==='新增愛心基金報表';
      }) ||
      Array.from(document.querySelectorAll('#love button')).find(function(b){
        return (b.textContent||'').includes('新增');
      });

    if(newBtn){
      newBtn.insertAdjacentElement(
        'afterend',
        createButton('v173ModifyLoveBtn','修改愛心基金報表',window.modifyLoveReportV173)
      );
      return;
    }

    const page=$('love');
    const card=page&&page.querySelector('.card');
    if(card){
      const box=document.createElement('div');
      box.className='actions no-print';
      box.style.marginBottom='10px';
      box.appendChild(createButton('v173ModifyLoveBtn','修改愛心基金報表',window.modifyLoveReportV173));
      card.insertBefore(box,card.firstChild);
    }
  }

  function labels(){
    try{document.title='龍興會智慧管理系統 '+VERSION;}catch(e){}
    try{
      const small=document.querySelector('.brand small');
      if(small)small.textContent=VERSION+'｜財務、愛心基金儲存後可修改';
    }catch(e){}
    try{
      const badge=document.querySelector('.update-badge');
      if(badge)badge.textContent='雙報表修改・V1.1.73';
    }catch(e){}
  }

  function boot(){
    labels();
    addFinanceButton();
    addLoveButton();
    setTimeout(function(){addFinanceButton();addLoveButton();},400);
    setTimeout(function(){addFinanceButton();addLoveButton();},1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
