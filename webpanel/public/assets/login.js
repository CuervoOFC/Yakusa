const form = document.getElementById('form');
const alertBox = document.getElementById('alert');

function showError(msg){
  alertBox.style.display = 'block';
  alertBox.textContent = msg;
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  alertBox.style.display='none';

  const fd = new FormData(form);
  const username = (fd.get('username')||'').toString();
  const password = (fd.get('password')||'').toString();

  try{
    const r = await fetch('/api/auth/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Error');
    location.href = '/dashboard';
  }catch(err){
    showError(err.message || 'Error');
  }
});
