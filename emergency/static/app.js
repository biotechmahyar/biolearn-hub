const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

menuBtn?.addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelectorAll('[data-toast]').forEach((button) => {
  button.addEventListener('click', () => showToast(button.dataset.toast));
});
document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
    item.classList.add('active');
    sidebar.classList.remove('open');
  });
});
document.getElementById('focusBtn')?.addEventListener('click', () => {
  document.querySelector('.hero-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('جلسه تمرکز امروز آماده است');
});
