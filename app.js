
// app.js - UI interactions and EEL calls
document.addEventListener('DOMContentLoaded', function(){
  // populate carousel
  const designs = [
{ title: 'Rosa 🩷', img: 'img/fotoimg1.jpeg' },
{ title: 'Dourado ✨', img: 'img/fotoimg2.jpeg' },
{ title: 'Azul 💙', img: 'img/fotoimg3.jpeg' },
{ title: 'Preto e rosa ✨', img: 'img/fotoimg4.jpeg' }

  ];
  const container = document.getElementById('nailCarousel');
  designs.forEach((d,i) => {
    const card = document.createElement('div');
    card.className = 'nail-card';
    card.innerHTML = `<img src="${d.img}" alt="${d.title}"><h4>${d.title}</h4>`;
    // tilt effect
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left)/rect.width - 0.5;
      const y = (e.clientY - rect.top)/rect.height - 0.5;
      card.style.transform = `rotateY(${x*14}deg) rotateX(${ -y*12 }deg) translateZ(6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 400ms ease';
      setTimeout(()=>card.style.transition='',400);
    });
    container.appendChild(card);
    
    card.addEventListener('click', () => {
      card.classList.toggle('spin');
    });

    card.style.animation = 'cardIn 500ms ease ' + (i*80) + 'ms both';
  });

  // keyframe
  const st = document.createElement('style');

  
// Initialize Firebase (if firebaseConfig is provided)
let FB = {
  enabled: false,
  db: null
};
try {
  // firebaseConfig is imported as default from firebase-config.js (module)
  // but we loaded firebase-config.js as a module; it sets `firebaseConfig` in global scope (browser).
  if (typeof firebaseConfig !== 'undefined' && firebaseConfig) {
    firebase.initializeApp(firebaseConfig);
    FB.db = firebase.firestore();
    FB.enabled = true;
    console.log('Firebase inicializado — Firestore habilitado.');
  } else {
    console.log('Firebase não configurado. Para usar Firestore cole as configs em web/firebase-config.js');
  }
} catch (err) {
  console.warn('Erro ao inicializar Firebase:', err);
}

  st.textContent = `@keyframes cardIn{from{opacity:0; transform: translateY(20px) scale(.98)} to{opacity:1; transform:none}}`;
  document.head.appendChild(st);

  // EEL functions (if available)
  const orderBtn = document.getElementById('orderBtn');
  if(orderBtn && window.eel){
    orderBtn.addEventListener('click', async () => {
      const id = await eel.py_order_id()();
      alert('Pedido gerado: ' + id);
    });
  }

  // form submit
  const bookForm = document.getElementById('bookForm');
  const formResult = document.getElementById('formResult');
  if(bookForm){
    bookForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(bookForm);
      const data = Object.fromEntries(fd.entries());
      try{
        // request order id from Python backend
        let orderId = null;
        if(window.eel){
          orderId = await eel.py_order_id()();
        } else {
          orderId = 'UN-Demo-' + Math.floor(Math.random()*10000);
        }
        data.id = orderId;
        // save to Firestore when configured
        if(FB.enabled){
          try{
            await saveAppointmentToFirestore(data);
            formResult.textContent = 'Agendamento salvo na nuvem! Código: ' + orderId;
            bookForm.reset();
          } catch(err){
            console.error(err);
            formResult.textContent = 'Erro ao salvar na nuvem. Código: ' + orderId + ' (salvo localmente temporariamente)';
          }
        } else {
          // fallback: call python to save locally
          if(window.eel){
            const res = await eel.py_book(data)();
            if(res && res.status === 'ok'){
              formResult.textContent = 'Agendamento confirmado! Código: ' + res.order;
              bookForm.reset();
            } else {
              formResult.textContent = 'Erro ao salvar. Tente novamente.';
            }
          } else {
            formResult.textContent = 'Modo demo (EEL não detectado). Código: ' + orderId;
          }
        }
      } catch(err){
        console.error(err);
        formResult.textContent = 'Erro inesperado. Veja o console.';
      }
    });
  }

  const estimateBtn = document.getElementById('estimateBtn');
  if(estimateBtn){
    estimateBtn.addEventListener('click', async () => {
      const service = document.querySelector('select[name="service"]').value;
      if(window.eel){
        const est = await eel.py_estimate(service)();
        alert('Tempo estimado: ' + est.text);
      } else {
        const est = {text: '≈ 45 minutos'};
        alert('Tempo estimado: ' + est.text);
      }
    });
  }
});


async function saveAppointmentToFirestore(payload){
  if(!FB.enabled || !FB.db){
    throw new Error('Firestore não configurado');
  }
  // ensure timestamp fields
  payload.created_at = new Date().toISOString();
  const docRef = await FB.db.collection('appointments').add(payload);
  return docRef.id;
}
