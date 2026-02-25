export const PREPARATION_GUIDE_HTML = `<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #F9F5EF;
    --warm-white: #FEFCF8;
    --charcoal: #1C1C1E;
    --deep-brown: #2C1810;
    --accent-gold: #C4943A;
    --accent-rust: #B85C38;
    --muted-sage: #8B9E88;
    --light-stone: #E8E0D5;
    --mid-stone: #C9BFB3;
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'Noto Sans KR', sans-serif;
    background: var(--cream);
    color: var(--charcoal);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── HERO ── */
  .hero {
    position: relative;
    background: var(--deep-brown);
    padding: 35px 24px 39px;
    text-align: center;
    overflow: hidden;
  }

  .hero::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(196,148,58,0.18) 0%, transparent 70%),
      radial-gradient(ellipse 40% 40% at 10% 80%, rgba(184,92,56,0.12) 0%, transparent 60%);
  }

  .hero-eyebrow {
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 8px;
    font-weight: 500;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--accent-gold);
    margin-bottom: 14px;
    opacity: 0;
    animation: fadeUp 0.7s ease forwards 0.1s;
  }

  .hero-title {
    font-family: 'Noto Serif KR', serif;
    font-size: clamp(21.6px, 4.7vw, 34.8px);
    font-weight: 900;
    color: var(--warm-white);
    line-height: 1.15;
    letter-spacing: -0.02em;
    opacity: 0;
    animation: fadeUp 0.7s ease forwards 0.25s;
  }

  .hero-title em {
    font-style: normal;
    color: var(--accent-gold);
  }

  .hero-sub {
    margin-top: 13px;
    font-size: 10px;
    font-weight: 300;
    color: rgba(254,252,248,0.55);
    letter-spacing: 0.04em;
    opacity: 0;
    animation: fadeUp 0.7s ease forwards 0.4s;
  }

  .hero-divider {
    width: 40px; height: 2px;
    background: var(--accent-gold);
    margin: 14px auto 0;
    opacity: 0;
    animation: fadeUp 0.7s ease forwards 0.55s;
  }

  /* ── SECTION WRAPPER ── */
  .section {
    max-width: 680px;
    margin: 0 auto;
    padding: 64px 24px;
  }

  .section-label {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--accent-gold);
    margin-bottom: 10px;
  }

  .section-title {
    font-family: 'Noto Serif KR', serif;
    font-size: clamp(26px, 5vw, 36px);
    font-weight: 700;
    color: var(--deep-brown);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  /* ── ITEMS GRID ── */
  .gender-block {
    margin-top: 48px;
  }

  .gender-block + .gender-block {
    margin-top: 56px;
    padding-top: 56px;
    border-top: 1px solid var(--light-stone);
  }

  .gender-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 32px;
  }

  .gender-tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--charcoal);
    color: var(--warm-white);
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 8px 18px;
    border-radius: 2px;
  }

  .gender-tag.female {
    background: var(--accent-rust);
  }

  .gender-line {
    flex: 1;
    height: 1px;
    background: var(--light-stone);
  }

  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
  }

  .item-card {
    background: var(--warm-white);
    border: 1px solid var(--light-stone);
    border-radius: 4px;
    padding: 28px 20px 22px;
    text-align: center;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    cursor: default;
  }

  .item-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(44,24,16,0.1);
    border-color: var(--accent-gold);
  }

  .item-icon {
    font-size: 40px;
    line-height: 1;
    margin-bottom: 14px;
    display: block;
  }

  .item-name {
    font-family: 'Noto Serif KR', serif;
    font-size: 21px;
    font-weight: 700;
    color: var(--deep-brown);
    margin-bottom: 4px;
  }

  .item-sub {
    font-size: 14px;
    font-weight: 400;
    color: var(--muted-sage);
    letter-spacing: 0.05em;
  }

  /* ── NOTICE BANNER ── */
  .notice-banner {
    background: linear-gradient(135deg, #FFF8F0 0%, #FDF0E6 100%);
    border-left: 3px solid var(--accent-rust);
    border-radius: 0 4px 4px 0;
    padding: 16px 20px;
    margin-top: 40px;
    font-size: 17px;
    font-weight: 500;
    color: var(--accent-rust);
    line-height: 1.6;
  }

  /* ── CAUTION SECTION ── */
  .caution-section {
    background: var(--charcoal);
    padding: 72px 24px;
  }

  .caution-inner {
    max-width: 680px;
    margin: 0 auto;
  }

  .caution-header {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    margin-bottom: 48px;
  }

  .caution-title {
    font-family: 'Noto Serif KR', serif;
    font-size: clamp(28px, 5vw, 40px);
    font-weight: 900;
    color: var(--warm-white);
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .caution-title em {
    font-style: normal;
    color: var(--accent-gold);
  }

  .caution-badge {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--accent-gold);
    padding: 6px 12px;
    border-radius: 2px;
    white-space: nowrap;
    margin-bottom: 6px;
  }

  .caution-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .caution-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px 0;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    opacity: 0;
    transform: translateX(-12px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }

  .caution-item.visible {
    opacity: 1;
    transform: translateX(0);
  }

  .caution-num {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--accent-gold);
    min-width: 28px;
    padding-top: 2px;
  }

  .caution-text {
    font-size: 18px;
    font-weight: 300;
    color: rgba(254,252,248,0.75);
    line-height: 1.7;
    letter-spacing: 0.01em;
  }

  .caution-text strong {
    color: var(--accent-gold);
    font-weight: 600;
  }

  .caution-text .highlight-red {
    color: #E07060;
    font-weight: 600;
  }

  /* ── FOOTER ── */
  footer {
    background: var(--deep-brown);
    padding: 32px 24px;
    text-align: center;
  }

  .footer-text {
    font-size: 16px;
    font-weight: 300;
    color: rgba(254,252,248,0.35);
    letter-spacing: 0.08em;
  }

  /* ── ANIMATIONS ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 480px) {
    .items-grid { grid-template-columns: repeat(2, 1fr); }
    .caution-header { flex-direction: column; align-items: flex-start; gap: 10px; }
  }
</style>

<!-- HERO -->
<header class="hero">
  <h1 class="hero-title">Work<br><em>Preparation Guide</em></h1>
  <div class="hero-divider"></div>
</header>

<!-- PREPARATION ITEMS -->
<main>
  <section class="section">
    <p class="section-label">Preparation Items</p>
    <h2 class="section-title">근무 전 준비물 안내</h2>

    <!-- 남자 -->
    <div class="gender-block">
      <div class="gender-header">
        <span class="gender-tag">\u2642 남자 준비물</span>
        <span class="gender-line"></span>
      </div>
      <div class="items-grid">
        <div class="item-card">
          <span class="item-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h5.426a1 1 0 0 1 .863 .496l1.064 1.823a3 3 0 0 0 1.896 1.407l4.677 1.114a4 4 0 0 1 3.074 3.89v2.27a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1"/><path d="M14 13l1 -2"/><path d="M8 18v-1a4 4 0 0 0 -4 -4h-1"/><path d="M10 12l1.5 -3"/></svg></span>
          <div class="item-name">검정구두</div>
          <div class="item-sub">Black Dress Shoes</div>
        </div>
        <div class="item-card">
          <span class="item-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M13 3v6l4.798 5.142a4 4 0 0 1 -5.441 5.86l-6.736 -6.41a2 2 0 0 1 -.621 -1.451v-9.141h8"/><path d="M7.895 15.768c.708 -.721 1.105 -1.677 1.105 -2.768a4 4 0 0 0 -4 -4"/></svg></span>
          <div class="item-name">검정 양말</div>
          <div class="item-sub">Black Socks</div>
        </div>
      </div>
    </div>

    <!-- 여자 -->
    <div class="gender-block">
      <div class="gender-header">
        <span class="gender-tag female">\u2640 여자 준비물</span>
        <span class="gender-line"></span>
      </div>
      <div class="items-grid">
        <div class="item-card">
          <span class="item-icon"><svg width="40" height="40" viewBox="0 0 256 256" fill="#1C1C1E" xmlns="http://www.w3.org/2000/svg"><path d="M231,156.19,180,144.7,69.66,34.34a8,8,0,0,0-11.56.26C36.11,58.64,24,89,24,120v72a16,16,0,0,0,16,16H72a16,16,0,0,0,16-16V143.06c2.49,1.45,4.94,3,7.34,4.64a112.45,112.45,0,0,1,40.55,50.39A15.9,15.9,0,0,0,150.72,208H240a16,16,0,0,0,16-16v-4.73A31.72,31.72,0,0,0,231,156.19ZM72,192H40V128.29a110.88,110.88,0,0,1,32,7.12Zm168,0H150.68a128.36,128.36,0,0,0-46.27-57.46,126.9,126.9,0,0,0-64.12-22.26A110.67,110.67,0,0,1,64.46,51.78L170.34,157.66a8,8,0,0,0,3.9,2.14l53.24,12A15.81,15.81,0,0,1,240,187.31Z"/></svg></span>
          <div class="item-name">낮은 검정구두</div>
          <div class="item-sub">Low Heel Black Shoes</div>
        </div>
        <div class="item-card">
          <span class="item-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M13 3v6l4.798 5.142a4 4 0 0 1 -5.441 5.86l-6.736 -6.41a2 2 0 0 1 -.621 -1.451v-9.141h8"/><path d="M7.895 15.768c.708 -.721 1.105 -1.677 1.105 -2.768a4 4 0 0 0 -4 -4"/></svg></span>
          <div class="item-name">스타킹</div>
          <div class="item-sub">Stockings</div>
        </div>
        <div class="item-card">
          <span class="item-icon">💇‍♀️</span>
          <div class="item-name">머리망 · 머리핀</div>
          <div class="item-sub">Hair Net & Pins</div>
        </div>
      </div>
    </div>

    <!-- 액세서리 경고 -->
    <div class="notice-banner">
      \u26a0\ufe0f &nbsp;과도한 염색 및 네일아트, 피어싱 등의 악세서리 착용 시 근무가 불가할 수 있습니다.
    </div>
  </section>

  <!-- CAUTION -->
  <section class="caution-section">
    <div class="caution-inner">
      <div class="caution-header">
        <div>
          <div class="caution-badge">Important Notice</div>
          <h2 class="caution-title">주의<em>사항</em></h2>
        </div>
      </div>

      <ul class="caution-list" id="cautionList">
        <li class="caution-item">
          <span class="caution-num">01</span>
          <span class="caution-text">현장 상황에 따라서 정해진 근무 시간보다 <strong>조기 퇴근</strong> 또는 <strong>연장 근무</strong>될 수 있습니다.</span>
        </li>
        <li class="caution-item">
          <span class="caution-num">02</span>
          <span class="caution-text">근무에 적합하지 않은 용모복장 및 건강이상 발생 시 근무 제한 및 귀가 조치될 수 있습니다.</span>
        </li>
        <li class="caution-item">
          <span class="caution-num">03</span>
          <span class="caution-text">잦은 <span class="highlight-red">지각 또는 무단 결근</span> 시 근무가 제한될 수 있습니다.</span>
        </li>
        <li class="caution-item">
          <span class="caution-num">04</span>
          <span class="caution-text">근무 시작 <strong>30분 전 도착</strong>, 미준수 시 근무 제한될 수 있습니다.</span>
        </li>
        <li class="caution-item">
          <span class="caution-num">05</span>
          <span class="caution-text">미성년자는 <strong>부모님 동의</strong>(법적 후견인) 후 근무 가능합니다.</span>
        </li>
        <li class="caution-item">
          <span class="caution-num">06</span>
          <span class="caution-text">개인 부주의로 인한 귀중품 분실 또는 도난 사고 발생 시 책임지지 않습니다.</span>
        </li>
        <li class="caution-item">
          <span class="caution-num">07</span>
          <span class="caution-text">근무 중 본인 실수로 인한 손해 발생 시 과실에 따라 책임이 부과될 수 있습니다.</span>
        </li>
        <li class="caution-item">
          <span class="caution-num">08</span>
          <span class="caution-text">첫 근무자 <strong>전달사항(노선)</strong>을 꼭 확인하시고 근무에 임해주세요.</span>
        </li>
      </ul>
    </div>
  </section>
</main>

<footer>
  <p class="footer-text">궁금한 사항은 담당자에게 문의해 주세요 &nbsp;·&nbsp; Humend HR</p>
</footer>

<script>
  // Intersection Observer for caution items
  const items = document.querySelectorAll('.caution-item');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, 60 * Array.from(items).indexOf(entry.target));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(item => observer.observe(item));
</script>`;
