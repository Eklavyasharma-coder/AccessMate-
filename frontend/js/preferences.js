const root = document.documentElement;
const key = 'accessmate-ui-preferences';
const defaults = { theme: 'light', textSize: 'normal', contrast: 'normal', reducedMotion: false };
let prefs = { ...defaults };
try { prefs = { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { /* Ignore malformed local preferences. */ }
function apply() {
  root.dataset.theme = prefs.theme;
  root.dataset.textSize = prefs.textSize;
  root.dataset.contrast = prefs.contrast;
  root.dataset.reducedMotion = String(prefs.reducedMotion);
  document.querySelectorAll('[data-pref]').forEach((button) => {
    const type = button.dataset.pref;
    const active = (type === 'theme' && prefs.theme === 'dark') || (type === 'text-size' && prefs.textSize === 'large') || (type === 'contrast' && prefs.contrast === 'high') || (type === 'motion' && prefs.reducedMotion);
    button.setAttribute('aria-pressed', String(active));
  });
}
function save() { try { localStorage.setItem(key, JSON.stringify(prefs)); } catch { /* Preferences still work for this page. */ } apply(); }
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-pref]');
  if (!button) return;
  switch (button.dataset.pref) {
    case 'theme': prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; break;
    case 'text-size': prefs.textSize = prefs.textSize === 'large' ? 'normal' : 'large'; break;
    case 'contrast': prefs.contrast = prefs.contrast === 'high' ? 'normal' : 'high'; break;
    case 'motion': prefs.reducedMotion = !prefs.reducedMotion; break;
  }
  save();
});
apply();
