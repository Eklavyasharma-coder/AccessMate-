'use strict';
const nodemailer = require('nodemailer');

let _transporter = null;

function isConfigured() {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return _transporter;
}

async function sendPasswordReset(toEmail, resetToken) {
  if (!isConfigured()) {
    const e = new Error('Email delivery is not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in backend/.env.');
    e.status = 503;
    throw e;
  }
  const base = (process.env.APP_BASE_URL || 'http://localhost:5500').replace(/\/$/, '');
  const link = `${base}/reset-password.html?token=${encodeURIComponent(resetToken)}`;
  await getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || `AccessMate <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: 'Reset your AccessMate password',
    text:    `You requested a password reset.\n\nClick the link to set a new password (valid 1 hour):\n${link}\n\nIf you did not request this, ignore this email.`,
    html:    `<p>You requested a password reset.</p><p><a href="${link}">Reset your password</a> (valid 1 hour).</p><p>If you did not request this, ignore this email.</p>`,
  });
}

async function sendInvitation(toEmail, role, inviteToken) {
  if (!isConfigured()) {
    const e = new Error('Email delivery is not configured. Invitation email could not be sent.');
    e.status = 503;
    throw e;
  }
  const base = (process.env.APP_BASE_URL || 'http://localhost:5500').replace(/\/$/, '');
  const link = `${base}/accept-invite.html?token=${encodeURIComponent(inviteToken)}`;
  await getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || `AccessMate <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: `You have been invited to AccessMate as ${role}`,
    text:    `You have been invited to AccessMate.\n\nAccept your invitation and set your password:\n${link}\n\nThis link expires in 48 hours.`,
    html:    `<p>You have been invited to AccessMate as <strong>${role}</strong>.</p><p><a href="${link}">Accept invitation and set password</a> (expires in 48 hours).</p>`,
  });
}

module.exports = { isConfigured, sendPasswordReset, sendInvitation };
