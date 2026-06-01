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
    setupCommandTabs();
    setupPRMergeSim();
    setupGitGraphSim();
    setupFlipCards();
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
    
    // Remove active class from old slide
    slides[currentSlide].classList.remove('slide-active');
    
    currentSlide = index;
    
    // Translate slides container
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}vw)`;
    
    // Set active class to new slide
    slides[currentSlide].classList.add('slide-active');
    
    updateNavigation();
    animateSlideElements(currentSlide);
  }

  window.goToSlide = goToSlide;

  // Update navigation UI (buttons, counts, dots)
  function updateNavigation() {
    // Buttons state
    if (currentSlide === 0) {
      prevBtn.style.opacity = '0.3';
      prevBtn.style.pointerEvents = 'none';
    } else {
      prevBtn.style.opacity = '1';
      prevBtn.style.pointerEvents = 'auto';
    }

    if (currentSlide === totalSlides - 1) {
      nextBtn.style.opacity = '0.3';
      nextBtn.style.pointerEvents = 'none';
    } else {
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
    }

    // Number text
    const formattedNum = String(currentSlide + 1).padStart(2, '0');
    const formattedTotal = String(totalSlides).padStart(2, '0');
    slideNumText.textContent = `${formattedNum} / ${formattedTotal}`;

    // Progress bar
    const progressPercent = ((currentSlide + 1) / totalSlides) * 100;
    progressLine.style.width = `${progressPercent}%`;

    // Update Dots
    const dots = document.querySelectorAll('.indicator-dot');
    dots.forEach((dot, idx) => {
      if (idx === currentSlide) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  // Setup keyboard & scroll click bindings
  function setupEventListeners() {
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        goToSlide(currentSlide + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToSlide(currentSlide - 1);
      }
    });

    // Button click listeners
    prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    // Mouse wheel slide transition with throttling
    let scrollThrottle = false;
    window.addEventListener('wheel', (e) => {
      if (window.innerWidth <= 768) return; // Disable scroll snap slider on mobile layout
      
      e.preventDefault();
      if (scrollThrottle) return;

      scrollThrottle = true;
      setTimeout(() => { scrollThrottle = false; }, 1000);

      if (e.deltaY > 30) {
        goToSlide(currentSlide + 1);
      } else if (e.deltaY < -30) {
        goToSlide(currentSlide - 1);
      }
    }, { passive: false });
  }

  // Reset/Animate elements when entering a slide
  function animateSlideElements(slideIndex) {
    // Can trigger custom JS animations per slide here if necessary
    if (slideIndex === 5) { // Collaboration workflow slide (Index 5)
      resetGitGraph();
    }
  }

  // Global ambient particle engine
  function initGlobalParticles() {
    const canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const maxParticles = 80;

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 2 + 0.5;
        this.color = `rgba(107, 216, 203, ${Math.random() * 0.15 + 0.05})`;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx = -this.vx;
        if (this.y < 0 || this.y > height) this.vy = -this.vy;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      // Subtle neural connectors
      ctx.strokeStyle = 'rgba(107, 216, 203, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  // Interactive Docker basics command tabs
  function setupCommandTabs() {
    const tabs = document.querySelectorAll('.cmd-tab');
    const display = document.getElementById('dockerCodeDisplay');
    const expl = document.getElementById('dockerExpl');

    const data = {
      pull: {
        code: `<span class="code-keyword">docker pull</span> node:18-alpine\n<span class="code-comment"># Pulls the official Node.js alpine image from Docker Hub</span>\n\nStatus: Downloaded newer image for node:18-alpine\ndocker.io/library/node:18-alpine`,
        expl: '<strong>docker pull [image]:</strong> Downloads a pre-packaged template (Image) from Docker Hub registry. The base image contains all runtime files, core utilities, and standard libraries needed to spin up your application environment.'
      },
      run: {
        code: `<span class="code-keyword">docker run</span> -d -p <span class="code-arg">3000:3000</span> --name app-container my-web-app\n<span class="code-comment"># Runs the container in background (-d) and maps port 3000</span>\n\nb82c3f81ad998efd82136cc... (Container ID hashes)\nServer running on port 3000`,
        expl: '<strong>docker run [options] [image]:</strong> Instantiates a container from an image. Using <code>-d</code> executes it in detached mode (background). The port parameter (<code>-p 3000:3000</code>) binds port 3000 on your host machine to port 3000 inside the container.'
      },
      ps: {
        code: `<span class="code-keyword">docker ps</span>\n<span class="code-comment"># Lists active containers running on the host system</span>\n\nCONTAINER ID   IMAGE         COMMAND                  STATUS         PORTS\nb82c3f81ad99   my-web-app    "docker-entrypoint.s…"   Up 2 minutes   0.0.0.0:3000->3000/tcp`,
        expl: '<strong>docker ps:</strong> Telemetry tool that lists running containers. Adding <code>-a</code> lists all containers, active or stopped, useful for inspecting crashed setups or cleaning up old workspaces.'
      }
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('bg-primary/20', 'border-primary', 'text-primary'));
        tab.classList.add('bg-primary/20', 'border-primary', 'text-primary');
        
        const cmd = tab.dataset.cmd;
        display.innerHTML = data[cmd].code;
        expl.innerHTML = data[cmd].expl;
      });
    });
  }

  // Pull request merge simulator
  function setupPRMergeSim() {
    const mergeBtn = document.getElementById('mergePrBtn');
    const prStatus = document.getElementById('prStatus');
    const mergeSuccessMsg = document.getElementById('mergeSuccessMsg');

    if (!mergeBtn) return;

    mergeBtn.addEventListener('click', () => {
      // Transition button to loading state
      mergeBtn.disabled = true;
      mergeBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px] mr-2">sync</span> Merging...`;

      setTimeout(() => {
        // Successful simulation
        mergeBtn.style.display = 'none';
        prStatus.className = 'px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 font-label-sm text-label-sm uppercase rounded-md flex items-center gap-1.5';
        prStatus.innerHTML = `<span class="material-symbols-outlined text-[16px]">call_merge</span> Merged`;
        mergeSuccessMsg.classList.remove('hidden');
        mergeSuccessMsg.classList.add('animate-fade-in');
        
        // Add animated confetti or success particles inside the PR card
        triggerPRConfetti();
      }, 1500);
    });
  }

  function triggerPRConfetti() {
    const container = document.querySelector('.pr-diff-card');
    for (let i = 0; i < 30; i++) {
      const piece = document.createElement('div');
      piece.style.position = 'absolute';
      piece.style.width = '6px';
      piece.style.height = '6px';
      piece.style.background = i % 2 === 0 ? 'var(--color-primary)' : 'var(--color-accent-green)';
      piece.style.left = '50%';
      piece.style.top = '50%';
      piece.style.borderRadius = '50%';
      piece.style.zIndex = '50';
      container.appendChild(piece);

      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 100 + 50;
      const destX = Math.cos(angle) * velocity;
      const destY = Math.sin(angle) * velocity - 30;

      piece.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
      ], {
        duration: 1000 + Math.random() * 500,
        easing: 'cubic-bezier(0.1, 0.8, 0.25, 1)',
        fill: 'forwards'
      });

      setTimeout(() => piece.remove(), 1500);
    }
  }

  // Interactive Flip Cards (troubleshooting slide)
  function setupFlipCards() {
    const cards = document.querySelectorAll('.flip-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('flipped');
      });
    });
  }

  // Collaboration Git graph simulator
  let commitInterval;
  function setupGitGraphSim() {
    resetGitGraph();
  }

  function resetGitGraph() {
    const container = document.getElementById('gitNodesContainer');
    if (!container) return;
    container.innerHTML = '';
    clearInterval(commitInterval);

    // Initial structure
    const initialNodes = [
      { x: 15, y: 50, label: 'Initial', main: true },
      { x: 30, y: 50, label: 'dev-env', main: true },
      { x: 45, y: 70, label: 'feat/onboard', main: false },
      { x: 60, y: 70, label: 'WIP-docs', main: false },
      { x: 75, y: 70, label: 'fix-nav', main: false },
      { x: 88, y: 50, label: 'Merge-PR', main: true }
    ];

    let currentIdx = 0;

    function renderNextNode() {
      if (currentIdx >= initialNodes.length) {
        setTimeout(resetGitGraph, 4000); // restart loop
        return;
      }

      const nodeData = initialNodes[currentIdx];
      const node = document.createElement('div');
      node.className = `git-node ${nodeData.main ? 'main-commit' : 'feature-commit'}`;
      node.style.left = `${nodeData.x}%`;
      node.style.top = `${nodeData.y}%`;
      
      const label = document.createElement('span');
      label.className = 'git-node-label';
      label.textContent = nodeData.label;
      node.appendChild(label);
      
      container.appendChild(node);
      
      // Animate node pop
      node.animate([
        { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 1 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
      ], {
        duration: 400,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      });

      currentIdx++;
    }

    // Sequentially draw the commits
    commitInterval = setInterval(renderNextNode, 1200);
    renderNextNode();
  }

  // Fire everything
  init();
});
