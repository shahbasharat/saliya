/* birthday_script.js
   Final standalone JS: animations + accessible modal + webhook POST to your Apps Script.
   WEBHOOK_URL is set to the exec URL you provided.
   Save this as birthday_script.js and include <script src="birthday_script.js" defer></script> in your HTML.
*/
(function () {
  'use strict';

  // Prevent double init
  if (window.__birthdayWidgetLoaded) return;
  window.__birthdayWidgetLoaded = true;

  // -----------------------
  // CONFIG
  // -----------------------
  const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzQuMj0PMPUCkgNF637V0mJymLmwJVxwLM61SEmH2tszhytvq0ot15rZ1_uVAgQnJFwpA/exec';

  // -----------------------
  // Load GSAP dynamically (non-blocking)
  // -----------------------
  (function loadGsap() {
    try {
      if (window._gsapLoaded || window.gsap) { window._gsapLoaded = true; return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.5/gsap.min.js';
      s.defer = true;
      s.onload = function () { window._gsapLoaded = true; };
      s.onerror = function () { console.warn('GSAP failed to load'); };
      document.head.appendChild(s);
    } catch (err) {
      console.warn('GSAP loader error:', err);
    }
  })();

  // -----------------------
  // DOM refs
  // -----------------------
  const confettiBtn = document.getElementById('confettiBtn');
  const sendBtn = document.getElementById('sendBtn');
  const image = document.getElementById('imagePath');
  const balloonsContainer = document.getElementById('balloons');
  const heartsContainer = document.getElementById('hearts');
  const playBtn = document.getElementById('playBtn');
  const audioEl = document.getElementById('bgAudio');
  let lastFocusedElement = null;

  // -----------------------
  // Helpers
  // -----------------------
  function getLiveRegion() {
    let live = document.getElementById('audio-status');
    if (!live) {
      live = document.createElement('div');
      live.id = 'audio-status';
      live.className = 'visually-hidden';
      live.setAttribute('aria-live', 'polite');
      live.style.position = 'absolute';
      live.style.left = '-9999px';
      document.body.appendChild(live);
    }
    return live;
  }

  // sendResponse: POSTs JSON to your Apps Script webhook
  async function sendResponse(payload) {
    if (!WEBHOOK_URL || WEBHOOK_URL.includes('REPLACE_WITH')) {
      console.warn('Missing WEBHOOK_URL — replace it with your Apps Script exec URL.');
      return { ok: false, message: 'No webhook configured' };
    }
    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'cors'
      });
      if (!resp.ok) {
        const text = await resp.text().catch(()=>String(resp.status));
        return { ok: false, status: resp.status, message: text };
      }
      const data = await resp.json().catch(()=> ({}));
      return { ok: true, data };
    } catch (err) {
      console.error('sendResponse error:', err);
      return { ok: false, message: String(err) };
    }
  }

  // Convenience wrapper to send just the choice
  async function sendEmail(choice) {
    const payload = {
      name: document.getElementById('name')?.textContent?.trim() || 'Saliya',
      choice: choice,
      timestamp: new Date().toISOString()
    };
    return await sendResponse(payload);
  }

  // -----------------------
  // Audio handling
  // -----------------------
 (() => {
  const playBtn = document.getElementById('playBtn');
  const audioEl = document.getElementById('bgAudio');
  if (!playBtn || !audioEl) return console.warn('Missing #playBtn or #bgAudio');

  // Remove existing click listeners by cloning the node (cheap way)
  const newPlayBtn = playBtn.cloneNode(true);
  playBtn.parentNode.replaceChild(newPlayBtn, playBtn);

  // Ensure audioEl.src is set from <source>
  if (!audioEl.src) {
    const s = audioEl.querySelector('source');
    if (s && s.src) {
      audioEl.src = s.src;
      try { audioEl.load(); } catch(e){}
    }
  }

  // Robust play handler
  async function playHandler() {
    try {
      if (audioEl.paused) {
        await audioEl.play();
        newPlayBtn.textContent = 'Pause Music ⏸';
        newPlayBtn.setAttribute('aria-pressed','true');
      } else {
        audioEl.pause();
        newPlayBtn.textContent = 'Play Music ▶';
        newPlayBtn.setAttribute('aria-pressed','false');
      }
      console.log('Audio state:', { paused: audioEl.paused, currentSrc: audioEl.currentSrc });
    } catch(err) {
      console.warn('Audio.play() failed:', err);
      // fallback: show native controls so user can tap manually
      audioEl.controls = true;
      audioEl.style.display = 'block';
      // small toast
      const t = document.createElement('div'); t.textContent = 'Playback blocked — tap the audio control to start.'; t.style.cssText = 'position:fixed;right:12px;bottom:12px;padding:8px 12px;background:rgba(0,0,0,0.75);color:#fff;border-radius:8px;z-index:999999';
      document.body.appendChild(t); setTimeout(()=>t.remove(),4000);
    }
  }

  newPlayBtn.addEventListener('click', playHandler);
  newPlayBtn.addEventListener('keydown', e => { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); playHandler(); } });

  console.log('Robust play handler installed. Click Play Music (or use audio control if shown).');
})();


  // -----------------------
  // Animations: image / hearts / balloons
  // -----------------------
  function animateImageIn() {
    if (window._gsapLoaded && window.gsap && image) {
      try { gsap.fromTo(image, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'power2.out' }); }
      catch (e) { image.style.opacity = 1; image.style.transform = 'scale(1)'; }
    } else if (image) {
      image.style.opacity = 1; image.style.transform = 'scale(1)';
    }
  }
  animateImageIn();

  (function createHearts() {
    if (!heartsContainer) return;
    const heartChars = ['❤️','💛','💕'];
    for (let i = 0; i < 8; i++) {
      const h = document.createElement('div');
      h.className = 'heart';
      h.textContent = heartChars[i % heartChars.length];
      h.style.left = Math.random()*100 + '%';
      h.style.top = Math.random()*100 + '%';
      h.style.fontSize = (12 + Math.random()*24) + 'px';
      h.style.opacity = '0.16';
      heartsContainer.appendChild(h);
      if (window._gsapLoaded && window.gsap) {
        try {
          gsap.to(h, { y: '-=40', x: '+=20', rotation: '+=10', repeat:-1, yoyo:true, duration:4+Math.random()*4, ease:'sine.inOut', delay: Math.random()*2});
        } catch(e) { h.style.animation = 'float 5s infinite ease-in-out'; }
      } else { h.style.animation = 'float 5s infinite ease-in-out'; }
    }
  })();

  (function createBalloons() {
    if (!balloonsContainer) return;
    const balloonColors = ['#ff7aa2','#ffd27a','#7ad3ff','#b7ff7a','#bda1ff'];
    for (let i = 0; i < 10; i++) {
      const el = document.createElement('div');
      el.className = 'balloon';
      el.style.left = (Math.random()*80) + 'px';
      el.style.top = (Math.random()*80) + 'px';
      el.innerHTML = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="26" rx="20" ry="22" fill="${balloonColors[i%balloonColors.length]}"/><path d="M32 48 L32 60" stroke="#333" stroke-width="1.2" stroke-opacity=".25"/></svg>`;
      balloonsContainer.appendChild(el);
      if (window._gsapLoaded && window.gsap) {
        try {
          gsap.to(el, { y: -100 - Math.random()*100, x: '+=30', rotation: '+=15', repeat:-1, yoyo:true, duration:8 + Math.random()*6, delay: Math.random()*3});
        } catch(e) { el.style.animation = 'drift 7s infinite ease-in-out'; }
      } else { el.style.animation = 'drift 7s infinite ease-in-out'; }
    }
  })();

  // -----------------------
  // Confetti
  // -----------------------
  function launchConfetti(count) {
    count = typeof count === 'number' ? count : 60;
    const colors = ['#ff7aa2','#ffd27a','#7ad3ff','#b7ff7a','#bda1ff'];
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.style.position = 'fixed';
      c.style.width = '10px';
      c.style.height = '14px';
      c.style.left = (50 + (Math.random()*60 - 30)) + '%';
      c.style.top = (20 + Math.random()*10) + '%';
      c.style.background = colors[Math.floor(Math.random()*colors.length)];
      c.style.zIndex = 99999;
      c.style.borderRadius = '2px';
      c.style.opacity = '0.95';
      document.body.appendChild(c);
      if (window._gsapLoaded && window.gsap) {
        try { gsap.to(c, { y: 600 + Math.random()*200, x: (Math.random()*400 - 200), rotation: Math.random()*720, duration: 1.6 + Math.random(), ease: 'power2.out', onComplete: ()=> c.remove() }); }
        catch(e) { setTimeout(()=> c.remove(), 1800); }
      } else { setTimeout(()=> c.remove(), 1800); }
    }
  }
  if (confettiBtn) confettiBtn.addEventListener('click', ()=> launchConfetti(80));

  // -----------------------
  // Modal with accessible focus trap + POST handlers
  // -----------------------
  function openProposalModal() {
    lastFocusedElement = document.activeElement;

    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    const box = document.createElement('div'); box.className = 'modal-box';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'modal-title'); box.setAttribute('aria-describedby', 'modal-message');

    box.innerHTML = '<div style="font-size:34px">💌</div>' +
      '<div id="modal-title" style="font-weight:700;margin-top:8px">I wanted to say something...</div>' +
      '<div id="modal-message" style="margin-top:8px;font-size:15px"><strong>Saliya…</strong> I really like you.</div>';

    const actions = document.createElement('div'); actions.style.marginTop = '14px'; actions.style.display = 'flex'; actions.style.justifyContent = 'center'; actions.style.gap = '8px';
    const yes = document.createElement('button'); yes.className = 'modal-btn modal-yes'; yes.textContent = 'Yes ❤️'; yes.type = 'button';
    const no  = document.createElement('button'); no.className  = 'modal-btn modal-no';  no.textContent  = 'No 😅';  no.type = 'button';
    actions.appendChild(yes); actions.appendChild(no); box.appendChild(actions);

    const note = document.createElement('div'); note.style.marginTop='10px'; note.style.fontSize='13px'; note.style.color='#555'; note.textContent='Take your time — I just wanted to be honest.'; box.appendChild(note);

    overlay.appendChild(box); document.body.appendChild(overlay);

    if (window._gsapLoaded && window.gsap) {
      try { gsap.fromTo(box, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.4)' }); }
      catch(e) { /* ignore */ }
    }

    // Focus management
    yes.focus();
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    function getFocusable() { return Array.from(box.querySelectorAll(focusableSelectors)).filter(el => !el.hasAttribute('disabled')); }

    function keepFocus(e) { if (!box.contains(document.activeElement)) { e.preventDefault(); const f = getFocusable(); if (f && f[0]) f[0].focus(); } }
    document.addEventListener('focus', keepFocus, true);

    function closeModal() {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focus', keepFocus, true);
      overlay.remove();
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
    }

    // --- YES handler: UI + POST
    yes.addEventListener('click', async () => {
      launchConfetti(140);
      box.innerHTML = '<div style="font-size:34px">🎉</div><div style="font-weight:700;margin-top:8px">Yay! 💛</div><div style="margin-top:8px;color:#444">Thanks — I\'ll make your day special.</div>';
      if (window._gsapLoaded && window.gsap) { try { gsap.fromTo(box, { scale: 0.95 }, { scale: 1.02, duration: 0.25, yoyo: true, repeat:1 }); } catch(e){} }

      const res = await sendEmail('yes');
      if (!res.ok) {
        const errNode = document.createElement('div'); errNode.style.marginTop = '10px'; errNode.style.fontSize = '13px'; errNode.style.color = '#b00020';
        errNode.textContent = 'Could not send response — saved locally.';
        box.appendChild(errNode);
        try { localStorage.setItem('lastBirthdayResponse', JSON.stringify({ choice:'yes', time:new Date().toISOString() })); } catch(e){}
        console.warn('sendResponse failed:', res);
      }
      setTimeout(closeModal, 2500);
    });

    // --- NO handler: UI + POST
    no.addEventListener('click', async () => {
      box.innerHTML = '<div style="font-size:34px">💔</div><div style="font-weight:700;margin-top:8px">Oh...</div><div style="margin-top:8px;color:#444">It\'s okay — thank you for your honesty.</div>';
      if (window._gsapLoaded && window.gsap) { try { gsap.fromTo(box, { opacity: 0.5 }, { opacity: 1, duration: 0.4 }); } catch(e){} }

      const res = await sendEmail('no');
      if (!res.ok) {
        const errNode = document.createElement('div'); errNode.style.marginTop = '10px'; errNode.style.fontSize = '13px'; errNode.style.color = '#b00020';
        errNode.textContent = 'Could not send response — saved locally.';
        box.appendChild(errNode);
        try { localStorage.setItem('lastBirthdayResponse', JSON.stringify({ choice:'no', time:new Date().toISOString() })); } catch(e){}
        console.warn('sendResponse failed:', res);
      }
      setTimeout(closeModal, 2800);
    });

    // keyboard handling: Escape + Tab trap
    function onKey(e) {
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) { e.preventDefault(); return; }
        const idx = focusable.indexOf(document.activeElement);
        if (e.shiftKey && idx === 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
        else if (!e.shiftKey && idx === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
  } // end openProposalModal

  // Hook chatbox button
  if (sendBtn) {
    sendBtn.addEventListener('click', openProposalModal);
    sendBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openProposalModal(); });
  }

  // Image fallback handler
  if (image) {
    image.addEventListener('error', () => {
      if (!image.dataset.fallbackApplied) {
        image.dataset.fallbackApplied = '1';
        image.src = './saliya.jpg';
        image.alt = 'Profile picture (fallback)';
      }
    });
  }


function sendResponse(choice) {
  const params = new URLSearchParams();
  params.append("choice", choice);
  params.append("name", document.getElementById("name").textContent);

  fetch("YOUR_EXEC_URL_HERE", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  }).then(r => console.log("Sent to Telegram:", r.status))
    .catch(e => console.warn("Failed:", e));
}


  // expose small API
  window.birthdayWidget = {
    launchConfetti: launchConfetti,
    openModal: openProposalModal
  };

})();
