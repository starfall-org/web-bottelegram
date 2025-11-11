// Simple test to verify store reactivity
import { telegramStore } from './src/stores/telegram.svelte.js';

console.log('Testing telegram store reactivity...');

// Test initial state
console.log('Initial token:', telegramStore.token);
console.log('Initial isConnected:', telegramStore.isConnected);

// Test setting a token
console.log('Setting test token...');
telegramStore.setToken('test_token_123');

// Check state after setting token
setTimeout(() => {
  console.log('Token after set:', telegramStore.token);
  console.log('IsConnected after set:', telegramStore.isConnected);
  console.log('Test completed!');
}, 1000);