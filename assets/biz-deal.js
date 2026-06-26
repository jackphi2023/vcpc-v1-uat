(function(){
  const nav=document.getElementById('navLinks'), menu=document.getElementById('menuBtn');
  menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}));

  let lang='vi';
  function applyLang(next){
    lang=next;document.documentElement.lang=lang;
    document.querySelectorAll('[data-vi][data-en]').forEach(el=>{el.textContent=el.getAttribute('data-'+lang);});
    document.querySelectorAll('[data-ph-vi][data-ph-en]').forEach(el=>{el.placeholder=el.getAttribute('data-ph-'+lang);});
    document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));
  }
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>applyLang(b.dataset.lang)));

  document.querySelectorAll('.acc-title').forEach(btn=>btn.addEventListener('click',()=>{
    const item=btn.closest('.acc-item'), content=item.querySelector('.acc-content'), was=item.classList.contains('active');
    document.querySelectorAll('.acc-item').forEach(x=>{x.classList.remove('active');x.querySelector('.acc-content').style.maxHeight=null;});
    if(!was){item.classList.add('active');content.style.maxHeight=content.scrollHeight+'px';}
  }));
  const first=document.querySelector('.acc-item.active .acc-content');if(first)first.style.maxHeight=first.scrollHeight+'px';

  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  document.querySelectorAll('[data-package]').forEach(link=>link.addEventListener('click',()=>{document.getElementById('stageSelect').value=link.dataset.package;}));

  const back=document.getElementById('backTop');
  window.addEventListener('scroll',()=>back.classList.toggle('show',window.scrollY>600),{passive:true});
  back.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

  const form=document.getElementById('contactForm'), status=document.getElementById('formStatus');
  form.addEventListener('submit',async(e)=>{
    e.preventDefault();const button=form.querySelector('button[type="submit"]'),original=button.textContent;
    button.disabled=true;button.textContent=lang==='vi'?'Đang gửi...':'Submitting...';status.className='form-status';
    try{
      const body=new URLSearchParams(new FormData(form)).toString();
      const res=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
      if(!res.ok)throw new Error('Submission failed');
      form.reset();status.textContent=lang==='vi'?'Đã gửi yêu cầu. VCPC sẽ liên hệ sau khi rà soát thông tin.':'Request submitted. VCPC will contact you after reviewing the information.';status.className='form-status show ok';
    }catch(err){status.textContent=lang==='vi'?'Chưa thể gửi form. Vui lòng gọi 0909 584 075 hoặc email partner@vietcapitalpartners.com.':'Unable to submit. Please call 0909 584 075 or email partner@vietcapitalpartners.com.';status.className='form-status show error';}
    finally{button.disabled=false;button.textContent=original;}
  });
  applyLang('vi');
})();
