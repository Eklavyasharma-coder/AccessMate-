import { API_BASE_URL, requireLogin, getToken } from './api.js';

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const welcome = document.querySelector('#welcomeText');
if (welcome) {
  if (requireLogin()) {
    const user = JSON.parse(localStorage.getItem('accessmate_user') || 'null');
    if (user?.name) {
      welcome.textContent = `Welcome back, ${user.name}. Your workspace is ready.`;
    }
  }
}

const navCta = document.querySelector('.nav-cta');
if (navCta && getToken()) {
  navCta.textContent = 'Dashboard';
  navCta.href = './dashboard.html';
}

const apiStatus = document.querySelector('#apiStatus');
const apiStatusDetail = document.querySelector('#apiStatusDetail');
if (apiStatus) {
  fetch(`${API_BASE_URL}/health`)
    .then((response) => {
      if (!response.ok) throw new Error('Backend returned an error');
      return response.json();
    })
    .then((data) => {
      apiStatus.textContent = 'Connected';
      apiStatusDetail.textContent = data.service || 'API is healthy';
    })
    .catch(() => {
      apiStatus.textContent = 'Offline';
      apiStatusDetail.textContent = 'Start backend and check API URL';
    });
}

document.querySelectorAll('[data-logout]').forEach((button) => {
  button.addEventListener('click', () => {
    localStorage.removeItem('accessmate_token');
    localStorage.removeItem('accessmate_user');
    window.location.href = './index.html';
  });
});

