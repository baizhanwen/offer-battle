const form=document.querySelector('#login-form'),error=document.querySelector('#login-error'),button=form.querySelector('button');
form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled)return;button.disabled=true;error.hidden=true;
  const body={username:form.elements.username.value.trim(),password:form.elements.password.value};
  try{const response=await fetch('/api/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.detail||'暂时无法登录，请重试');form.elements.password.value='';location.replace('/');}
  catch(e){error.textContent=e instanceof TypeError?'网络没有连上，请稍后重试':e.message;error.hidden=false;button.disabled=false;}
});
