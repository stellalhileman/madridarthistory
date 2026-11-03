// Loads the saved homepage images from Supabase.
// Add this script after supabase.js and public.js on public/index.html.
(async function loadHomepageImages() {
  if (!document.querySelector('.hero-art')) return;

  try {
    const { data, error } = await supabaseClient
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'homepage_hero_image',
        'homepage_exhibitions_image',
        'homepage_activities_image',
        'homepage_conferences_image'
      ]);

    if (error) {
      console.warn('Homepage images are using their defaults:', error.message);
      return;
    }

    const settings = Object.fromEntries((data || []).map(row => [row.key, row.value]));
    const heroUrl = settings.homepage_hero_image;
    const hero = document.querySelector('.hero');
    const heroArt = document.querySelector('.hero-art');

    if (heroUrl && hero && heroArt) {
      hero.classList.add('homepage-custom-banner');
      hero.style.display = 'block';
      heroArt.style.minHeight = 'clamp(260px, 45vw, 560px)';
      heroArt.style.width = '100%';
      heroArt.style.backgroundImage = `url("${heroUrl.replace(/"/g, '%22')}")`;
      heroArt.style.backgroundSize = 'cover';
      heroArt.style.backgroundPosition = 'center';
      heroArt.setAttribute('role', 'img');
      heroArt.setAttribute('aria-label', 'Art History homepage banner');
      heroArt.removeAttribute('aria-hidden');
      const copy = hero.querySelector('.hero-copy');
      if (copy) copy.hidden = true;
    }

    const cards = [
      ['homepage_exhibitions_image', '.feature-card.exhibition'],
      ['homepage_conferences_image', '.feature-card.conference'],
      ['homepage_activities_image', '.feature-card.activity']
    ];

    cards.forEach(([key, selector]) => {
      const url = settings[key];
      const card = document.querySelector(selector);
      if (url && card) {
        card.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
      }
    });
  } catch (error) {
    console.warn('Homepage images could not be loaded:', error);
  }
})();
