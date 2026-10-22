import { apiRequest } from './api.js';

const form = document.querySelector('#authForm');
const nameInput = document.querySelector('#name');
const nameLabel = document.querySelector('#nameLabel');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const message = document.querySelector('#authMessage');
const title = document.querySelector('#formTitle');
const submit = document.querySelector('#submitButton');
const loginTab = document.querySelector('#loginTab');
const registerTab = document.querySelector('#registerTab');
let mode = 'login';

function setMode(nextMode) {
  mode = nextMode;
  const registering = mode === 'register';
  nameInput.classList.toggle('hidden', !registering);
  nameLabel.classList.toggle('hidden', !registering);
  nameInput.required = registering;
  passwordInput.autocomplete = registering ? 'new-password' : 'current-password';
  title.textContent = registering ? 'Create account' : 'Sign in';
  submit.textContent = registering ? 'Create account' : 'Sign in';
  loginTab.classList.toggle('active', !registering);
  registerTab.classList.toggle('active', registering);
  message.textContent = '';
  message.className = 'form-message';
}
loginTab.addEventListener('click', () => setMode('login'));
registerTab.addEventListener('click', () => setMode('register'));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = 'Please wait…';
  message.className = 'form-message';
  submit.disabled = true;
  try {
    const payload = { email: emailInput.value.trim(), password: passwordInput.value };
    if (mode === 'register') payload.name = nameInput.value.trim();
    const result = await apiRequest(`/auth/${mode === 'register' ? 'register' : 'login'}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    localStorage.setItem('accessmate_token', result.token);
    localStorage.setItem('accessmate_user', JSON.stringify(result.user));
    message.textContent = 'Success! Opening your dashboard…';
    message.className = 'form-message success';
    window.location.href = './dashboard.html';
  } catch (error) {
    message.textContent = error.message;
    message.className = 'form-message error';
  } finally {
    submit.disabled = false;
  }
});
