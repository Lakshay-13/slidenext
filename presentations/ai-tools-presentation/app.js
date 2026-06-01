document.addEventListener('DOMContentLoaded', () => {
  // Navigation State
  let currentSlide = 0;
  const totalSlides = document.querySelectorAll('.slide').length;
  const slidesContainer = document.getElementById('slidesContainer');
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const slideNumText = document.getElementById('slideNum');
  const progressLine = document.getElementById('progressLine');
  const indicatorDots = document.getElementById('indicatorDots');

  // Initialization
  function init() {
    createIndicators();
    updateNavigation();
    setupEventListeners();
    initGlobalParticles();
    animateSlideElements(0);
    
    // Slide specific interactives
    setupVotingMechanics();
    setupRevealDetails();
    setupCustomTipRecorder();
    setupSequentialReveals();
  }

  // Create indicator dots dynamically
  function createIndicators() {
    indicatorDots.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('div');
      dot.className = `indicator-dot ${i === 0 ? 'active' : ''}`;
      dot.addEventListener('click', () => goToSlide(i));
      indicatorDots.appendChild(dot);
    }
  }

  // Go to specific slide
  function goToSlide(index) {
    if (index < 0 || index >= totalSlides) return;
    
    slides[currentSlide].classList.remove('slide-active');
    currentSlide = index;
    
    // Translate slides container horizontally
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}vw)`;
    slides[currentSlide].classList.add('slide-active');
    
    // Reset sequential reveals if starting over
    if (currentSlide === 0) {
      resetReveals();
    }
    
    updateNavigation();
    animateSlideElements(currentSlide);
  }

  window.goToSlide = goToSlide;

  // Update navigation UI (buttons, counts, dots)
  function updateNavigation() {
    // Previous Button status
    if (currentSlide === 0) {
      prevBtn.style.opacity = '0.3';
      prevBtn.style.pointerEvents = 'none';
    } else {
      prevBtn.style.opacity = '1';
      prevBtn.style.pointerEvents = 'auto';
    }

    // Next Button status
    if (currentSlide === totalSlides - 1) {
      nextBtn.style.opacity = '0.3';
      nextBtn.style.pointerEvents = 'none';
    } else {
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
    }

    // Slide Counter Label
    const formattedNum = String(currentSlide + 1).padStart(2, '0');
    const formattedTotal = String(totalSlides).padStart(2, '0');
    slideNumText.textContent = `${formattedNum} / ${formattedTotal}`;

    // Bottom progress line width
    const progressPercent = ((currentSlide + 1) / totalSlides) * 100;
    progressLine.style.width = `${progressPercent}%`;

    // Dot indicators matching active slide
    const dots = document.querySelectorAll('.indicator-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
    });
  }

  // Slide entrance GSAP timelines
  function animateSlideElements(index) {
    const activeSlide = slides[index];
    const allItems = activeSlide.querySelectorAll('.glass-panel, .glass-card, h1, h2, p, .practice-card, .ai-core-container');
    const revealItems = Array.from(allItems).filter(item => {
      // Exclude items that are currently hidden/sequentially revealed
      return !item.classList.contains('hidden') && !item.closest('.hidden');
    });
    
    // Reset/Kill previous animations
    gsap.killTweensOf(allItems);
    
    // Setup initial reveal state
    gsap.fromTo(revealItems, 
      { opacity: 0, y: 30, scale: 0.96 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        duration: 0.8, 
        stagger: 0.08, 
        ease: "power2.out", 
        delay: 0.15 
      }
    );
  }

  // Setup click, scroll, and arrow bindings
  function setupEventListeners() {
    prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        goToSlide(currentSlide + 1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToSlide(currentSlide - 1);
      }
    });

    // Mouse wheel transition (Debounced)
    let isWheeling = false;
    document.addEventListener('wheel', (e) => {
      if (isWheeling) return;
      if (Math.abs(e.deltaY) > 55) {
        isWheeling = true;
        if (e.deltaY > 0) {
          goToSlide(currentSlide + 1);
        } else {
          goToSlide(currentSlide - 1);
        }
        setTimeout(() => isWheeling = false, 900);
      }
    }, { passive: true });

    // Touch Swipe Support for mobile
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const threshold = 80;
      if (touchStartX - touchEndX > threshold) {
        goToSlide(currentSlide + 1);
      } else if (touchEndX - touchStartX > threshold) {
        goToSlide(currentSlide - 1);
      }
    }, { passive: true });
  }

  // --- Background Particles Loop ---
  function initGlobalParticles() {
    const canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 65;

    class Particle {
      constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.2;
        this.alpha = Math.random() * 0.6 + 0.15;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > w) this.speedX *= -1;
        if (this.y < 0 || this.y > h) this.speedY *= -1;
      }

      draw() {
        ctx.fillStyle = `rgba(0, 242, 255, ${this.alpha})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00f2ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animateParticles() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animateParticles);
    }

    animateParticles();

    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });
  }

  // --- Slide 2: Interactive Chatbot Preference voting ---
  const votes = {
    gemini: 0,
    chatgpt: 0,
    claude: 0
  };

  function setupVotingMechanics() {
    const cards = document.querySelectorAll('[data-vote]');
    
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-vote');
        votes[key]++;
        
        // Update label text
        const voteEl = document.getElementById(`${key}Votes`);
        if (voteEl) {
          voteEl.textContent = `${votes[key]} Vote${votes[key] === 1 ? '' : 's'}`;
        }

        // Toggle visual selected/voted class
        card.classList.add('voted');
        setTimeout(() => card.classList.remove('voted'), 400);

        // Click pulse pop animation
        gsap.fromTo(card, { scale: 0.96 }, { scale: 1, duration: 0.45, ease: "elastic.out(1.2, 0.4)" });

        // Add a floating +1 particle effect above the card
        createFloatingPlusOne(card, key);
      });
    });
  }

  function createFloatingPlusOne(card, key) {
    const rect = card.getBoundingClientRect();
    const plus = document.createElement('div');
    plus.className = 'absolute font-mono font-bold text-lg select-none pointer-events-none z-50';
    plus.textContent = '+1';
    
    // Choose color matching the brand theme
    if (key === 'gemini') plus.className += ' text-[#38bdf8]';
    if (key === 'chatgpt') plus.className += ' text-[#10b981]';
    if (key === 'claude') plus.className += ' text-[#f97316]';

    plus.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    plus.style.top = `${rect.top + window.scrollY}px`;
    document.body.appendChild(plus);

    gsap.fromTo(plus, 
      { opacity: 1, y: 0, scale: 0.8 },
      { 
        opacity: 0, 
        y: -60, 
        scale: 1.3, 
        duration: 0.8, 
        ease: "power2.out",
        onComplete: () => plus.remove()
      }
    );
  }

  // --- Slide 3 & 4 & 6: Click-to-Reveal Details Mechanics ---
  function setupRevealDetails() {
    // Handle Slide 3 specialized models
    const reveals = document.querySelectorAll('[data-reveal]');
    reveals.forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-reveal');
        const info = document.getElementById(`info-${key}`);
        const label = document.getElementById(`lbl-${key}`);

        if (info) {
          const isRevealed = info.classList.contains('revealed');
          info.classList.toggle('revealed', !isRevealed);
          
          if (label) {
            label.innerHTML = isRevealed 
              ? `<span class="material-symbols-outlined text-xs">unfold_more</span> Click to reveal`
              : `<span class="material-symbols-outlined text-xs">unfold_less</span> Hide info`;
          }

          // Spring pop
          gsap.fromTo(card, { scale: 0.98 }, { scale: 1, duration: 0.3, ease: "power2.out" });
        }
      });
    });

    // Handle Slide 4 Agentic tools click reveals
    const agents = document.querySelectorAll('[data-agent]');
    agents.forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-agent');
        const info = document.getElementById(`info-${key}`);
        const label = document.getElementById(`lbl-${key}`);

        if (info) {
          const isRevealed = info.classList.contains('revealed');
          info.classList.toggle('revealed', !isRevealed);
          
          if (label) {
            label.innerHTML = isRevealed 
              ? `<span class="material-symbols-outlined text-xs">unfold_more</span> Click to inspect`
              : `<span class="material-symbols-outlined text-xs">unfold_less</span> Hide info`;
          }
          gsap.fromTo(card, { scale: 0.98 }, { scale: 1, duration: 0.3, ease: "power2.out" });
        }
      });
    });

    // Handle Slide 6 Pro-tips click reveals
    const tips = document.querySelectorAll('[data-tip]');
    tips.forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-tip');
        const info = document.getElementById(`info-tip-${key}`);
        const label = document.getElementById(`lbl-tip-${key}`);

        if (info) {
          const isRevealed = info.classList.contains('revealed');
          info.classList.toggle('revealed', !isRevealed);
          
          if (label) {
            label.innerHTML = isRevealed 
              ? `<span class="material-symbols-outlined text-[10px]">unfold_more</span> View strategy`
              : `<span class="material-symbols-outlined text-[10px]">unfold_less</span> Hide strategy`;
          }
          gsap.fromTo(card, { scale: 0.98 }, { scale: 1, duration: 0.3, ease: "power2.out" });
        }
      });
    });
  }

  // --- Slide 5 & 6 Sequential Reveal Mechanics ---
  let revealedGoodCount = 0;
  let revealedBadCount = 0;
  let revealedTipCount = 0;

  function revealNextGood() {
    const cards = document.querySelectorAll('#goodPracticesContainer .practice-card');
    if (revealedGoodCount < cards.length) {
      const card = cards[revealedGoodCount];
      revealedGoodCount++;
      
      card.classList.remove('hidden');
      void card.offsetWidth;
      card.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
      card.classList.add('opacity-1', 'translate-y-0', 'pointer-events-auto');
      
      gsap.fromTo(card, 
        { scale: 0.92, opacity: 0, y: 15 }, 
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.2)" }
      );
      
      document.getElementById('goodCount').textContent = revealedGoodCount;
      
      if (revealedGoodCount === cards.length) {
        const btn = document.getElementById('revealGoodBtn');
        btn.innerHTML = `<span class="material-symbols-outlined text-xs">check</span> Completed`;
        btn.classList.add('opacity-50');
      }
    }
  }

  function revealNextBad() {
    const cards = document.querySelectorAll('#badPracticesContainer .practice-card');
    if (revealedBadCount < cards.length) {
      const card = cards[revealedBadCount];
      revealedBadCount++;
      
      card.classList.remove('hidden');
      void card.offsetWidth;
      card.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
      card.classList.add('opacity-1', 'translate-y-0', 'pointer-events-auto');
      
      gsap.fromTo(card, 
        { scale: 0.92, opacity: 0, y: 15 }, 
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.2)" }
      );
      
      document.getElementById('badCount').textContent = revealedBadCount;
      
      if (revealedBadCount === cards.length) {
        const btn = document.getElementById('revealBadBtn');
        btn.innerHTML = `<span class="material-symbols-outlined text-xs">check</span> Completed`;
        btn.classList.add('opacity-50');
      }
    }
  }

  function revealNextTip() {
    const cards = document.querySelectorAll('[data-tip], #customTipCard');
    if (revealedTipCount < cards.length) {
      const card = cards[revealedTipCount];
      revealedTipCount++;
      
      card.classList.remove('hidden');
      void card.offsetWidth;
      card.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
      card.classList.add('opacity-1', 'translate-y-0');
      
      gsap.fromTo(card, 
        { scale: 0.92, opacity: 0, y: 15 }, 
        { scale: 1, opacity: 1, y: 0, duration: 0.55, ease: "back.out(1.2)" }
      );
      
      document.getElementById('tipCount').textContent = revealedTipCount;
      
      if (revealedTipCount === cards.length) {
        const btn = document.getElementById('revealTipBtn');
        btn.innerHTML = `<span class="material-symbols-outlined text-xs">check</span> Completed`;
        btn.classList.add('opacity-50');
      }
    }
  }

  function setupSequentialReveals() {
    const revealGoodBtn = document.getElementById('revealGoodBtn');
    const revealBadBtn = document.getElementById('revealBadBtn');
    const revealTipBtn = document.getElementById('revealTipBtn');
    
    if (revealGoodBtn) {
      revealGoodBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        revealNextGood();
      });
    }
    
    if (revealBadBtn) {
      revealBadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        revealNextBad();
      });
    }
    
    if (revealTipBtn) {
      revealTipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        revealNextTip();
      });
    }
  }

  function resetReveals() {
    revealedGoodCount = 0;
    revealedBadCount = 0;
    revealedTipCount = 0;
    
    // Reset Good Practices
    const goodCards = document.querySelectorAll('#goodPracticesContainer .practice-card');
    goodCards.forEach(card => {
      card.classList.add('hidden', 'opacity-0', 'translate-y-4', 'pointer-events-none');
      card.classList.remove('opacity-1', 'translate-y-0', 'pointer-events-auto');
    });
    const goodCountEl = document.getElementById('goodCount');
    if (goodCountEl) goodCountEl.textContent = '0';
    const revealGoodBtn = document.getElementById('revealGoodBtn');
    if (revealGoodBtn) {
      revealGoodBtn.innerHTML = `<span class="material-symbols-outlined text-xs">add_circle</span> Reveal (0/3)`;
      revealGoodBtn.classList.remove('opacity-50');
    }
    
    // Reset Bad Practices
    const badCards = document.querySelectorAll('#badPracticesContainer .practice-card');
    badCards.forEach(card => {
      card.classList.add('hidden', 'opacity-0', 'translate-y-4', 'pointer-events-none');
      card.classList.remove('opacity-1', 'translate-y-0', 'pointer-events-auto');
    });
    const badCountEl = document.getElementById('badCount');
    if (badCountEl) badCountEl.textContent = '0';
    const revealBadBtn = document.getElementById('revealBadBtn');
    if (revealBadBtn) {
      revealBadBtn.innerHTML = `<span class="material-symbols-outlined text-xs">add_circle</span> Reveal (0/3)`;
      revealBadBtn.classList.remove('opacity-50');
    }
    
    // Reset Tip Cards
    const tipCards = document.querySelectorAll('[data-tip], #customTipCard');
    tipCards.forEach(card => {
      card.classList.add('hidden', 'opacity-0', 'translate-y-4', 'pointer-events-none');
      card.classList.remove('opacity-1', 'translate-y-0');
    });
    const tipCountEl = document.getElementById('tipCount');
    if (tipCountEl) tipCountEl.textContent = '0';
    const revealTipBtn = document.getElementById('revealTipBtn');
    if (revealTipBtn) {
      revealTipBtn.innerHTML = `<span class="material-symbols-outlined text-xs">add_circle</span> Reveal Next Tip (0/5)`;
      revealTipBtn.classList.remove('opacity-50');
    }
  }

  // --- Slide 6: Intern suggestion recorder with persistence ---
  function setupCustomTipRecorder() {
    const input = document.getElementById('customTipInput');
    const button = document.getElementById('customTipBtn');
    const content = document.getElementById('customTipContent');
    const card = document.getElementById('customTipCard');
    const inputLine = card ? card.querySelector('.terminal-input-line') : null;

    if (!button || !input || !content || !card) return;

    function loadSavedTip() {
      const savedTip = localStorage.getItem('customInternTip');
      if (savedTip) {
        content.innerHTML = `<strong class="text-[#00f2ff]">Custom Tip Recorded:</strong><br><span class="text-white">${savedTip}</span>`;
        if (inputLine) inputLine.style.display = 'none';
        button.textContent = 'Clear Tip';
        button.classList.remove('bg-[#00f2ff]/10', 'border-[#00f2ff]/30');
        button.classList.add('bg-red-500/10', 'border-red-500/30', 'text-red-400');
      } else {
        content.innerHTML = 'Add a prompt secret or shortcut used in your setup below. Let\'s record ideas!';
        if (inputLine) inputLine.style.display = 'flex';
        input.value = '';
        button.textContent = 'Save to slide';
        button.classList.add('bg-[#00f2ff]/10', 'border-[#00f2ff]/30');
        button.classList.remove('bg-red-500/10', 'border-red-500/30', 'text-red-400');
      }
    }

    button.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent card clicks
      
      const savedTip = localStorage.getItem('customInternTip');
      if (savedTip) {
        // Clear tip
        localStorage.removeItem('customInternTip');
        loadSavedTip();
        gsap.fromTo(content, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4 });
      } else {
        // Save tip
        const value = input.value.trim();
        if (value.length > 0) {
          localStorage.setItem('customInternTip', value);
          loadSavedTip();
          gsap.fromTo(content, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4 });
          
          // Soft pulse border
          gsap.fromTo(card, { borderColor: 'rgba(0, 242, 255, 0.8)' }, { borderColor: 'rgba(0, 242, 255, 0.3)', duration: 1.5 });
        }
      }
    });

    // Submit on enter key
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // stop presentation slide navigation
      if (e.key === 'Enter') {
        button.click();
      }
    });

    loadSavedTip();
  }

  init();
});
