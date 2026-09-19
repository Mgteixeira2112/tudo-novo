import test from 'node:test';
import assert from 'node:assert/strict';
import { authErrorPtBr } from '../src/services/authErrorPtBr.ts';

const fallback = 'Não foi possível entrar.';

test('traduz credenciais inválidas pelo código e pela mensagem Supabase', () => {
  const expected = 'Credenciais inválidas. Verifique seu e-mail e senha.';
  assert.equal(authErrorPtBr({ code: 'invalid_credentials', message: 'Invalid login credentials' }, fallback), expected);
  assert.equal(authErrorPtBr(new Error('Invalid login credentials'), fallback), expected);
});

test('distingue e-mail não confirmado de credenciais inválidas', () => {
  const expected = 'E-mail ainda não confirmado. Confirme sua conta antes de entrar.';
  assert.equal(authErrorPtBr({ code: 'email_not_confirmed', message: 'Invalid login credentials' }, fallback), expected);
  assert.equal(authErrorPtBr(new Error('Email not confirmed'), fallback), expected);
});

test('localiza limites de tentativas, conexão, cadastro e senha', () => {
  assert.match(authErrorPtBr({ code: 'over_request_rate_limit' }, fallback), /Muitas tentativas/);
  assert.match(authErrorPtBr({ code: 'over_email_send_rate_limit' }, fallback), /Muitos e-mails/);
  assert.match(authErrorPtBr(new Error('Failed to fetch'), fallback), /conectar ao servidor/);
  assert.match(authErrorPtBr(new Error('User already registered'), fallback), /Já existe/);
  assert.match(authErrorPtBr({ code: 'weak_password' }, fallback), /senha não atende/);
});

test('preserva rejeição explícita de acesso sem equipe ativa', () => {
  const message = 'Usuário autenticado, mas sem perfil de colaborador ativo.';
  assert.equal(authErrorPtBr(new Error(message), fallback), message);
});

test('não apresenta texto desconhecido em inglês nem detalhes técnicos', () => {
  assert.equal(authErrorPtBr(new Error('Unexpected database failure: internal details'), fallback), fallback);
  assert.equal(authErrorPtBr(null, fallback), fallback);
});
