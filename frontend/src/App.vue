<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeIndex = computed(() => route.path)
const mobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}
</script>

<template>
  <div class="app-container">
    <!-- Animated Background -->
    <div class="background-elements">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <div class="logo" @click="$router.push('/')">
          <div class="logo-icon">
            <span class="emoji">🎯</span>
          </div>
          <div class="logo-text">
            <span class="logo-main">社团</span>
            <span class="logo-sub">MATCH</span>
          </div>
        </div>

        <!-- Desktop Navigation -->
        <nav class="desktop-nav">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: activeIndex === item.path }"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </nav>

        <!-- Mobile Menu Toggle -->
        <button class="mobile-toggle" @click="toggleMobileMenu">
          <span class="hamburger" :class="{ open: mobileMenuOpen }"></span>
        </button>
      </div>
    </header>

    <!-- Mobile Navigation -->
    <div class="mobile-nav" :class="{ open: mobileMenuOpen }">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="mobile-nav-item"
        @click="mobileMenuOpen = false"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </router-link>
    </div>

    <!-- Main Content -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script lang="ts">
const navItems = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/clubs', label: '社团列表', icon: '📚' },
  { path: '/matching', label: '智能匹配', icon: '✨' },
  { path: '/chat', label: 'AI问答', icon: '💬' },
  { path: '/admin', label: '管理', icon: '⚙️' },
]
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Nunito:wght@600;700;800&display=swap');

/* Reset & Base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --color-primary: #FF6B6B;
  --color-primary-dark: #EE5A5A;
  --color-secondary: #2E86AB;
  --color-secondary-dark: #256B8F;
  --color-accent: #FFD93D;
  --color-accent-dark: #F0C929;
  --color-dark: #2D3436;
  --color-light: #F8F9FA;
  --color-white: #FFFFFF;
  --color-gray-100: #F1F3F5;
  --color-gray-200: #E9ECEF;
  --color-gray-300: #DEE2E6;
  --color-gray-600: #868E96;
  --font-display: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --shadow-sm: 0 2px 8px rgba(45, 52, 54, 0.08);
  --shadow-md: 0 8px 24px rgba(45, 52, 54, 0.12);
  --shadow-lg: 0 16px 48px rgba(45, 52, 54, 0.16);
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-full: 9999px;
}

body {
  font-family: var(--font-body);
  background: var(--color-light);
  color: var(--color-dark);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}

/* App Container */
.app-container {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

/* Background Elements */
.background-elements {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  animation: float 20s ease-in-out infinite;
}

.blob-1 {
  width: 400px;
  height: 400px;
  background: var(--color-primary);
  top: -100px;
  right: -100px;
  animation-delay: 0s;
}

.blob-2 {
  width: 300px;
  height: 300px;
  background: var(--color-secondary);
  bottom: 200px;
  left: -100px;
  animation-delay: -7s;
}

.blob-3 {
  width: 250px;
  height: 250px;
  background: var(--color-accent);
  top: 50%;
  right: 10%;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0) scale(1);
  }
  25% {
    transform: translate(-30px, 30px) scale(1.05);
  }
  50% {
    transform: translate(20px, -20px) scale(0.95);
  }
  75% {
    transform: translate(-20px, 20px) scale(1.02);
  }
}

/* Header */
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-gray-100);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: scale(1.02);
}

.logo-icon {
  width: 48px;
  height: 48px;
;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.logo-icon .emoji {
  font-size: 24px;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.logo-main {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 800;
  color: var(--color-dark);
}

.logo-sub {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 2px;
}

/* Desktop Navigation */
.desktop-nav {
  display: flex;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  text-decoration: none;
  color: var(--color-gray-600);
  font-weight: 500;
  transition: all 0.3s ease;
  font-size: 14px;
}

.nav-item:hover {
  color: var(--color-secondary);
  background: rgba(46, 134, 171, 0.1);
}

.nav-item.active {
  color: var(--color-white);
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%);
  box-shadow: 0 4px 12px rgba(46, 134, 171, 0.3);
}

.nav-icon {
  font-size: 18px;
}

.nav-label {
  font-weight: 600;
}

/* Mobile Toggle */
.mobile-toggle {
  display: none;
  width: 48px;
  height: 48px;
  background: var(--color-gray-100);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  padding: 12px;
}

.hamburger {
  display: block;
  width: 24px;
  height: 2px;
  background: var(--color-dark);
  position: relative;
  transition: all 0.3s ease;
}

.hamburger::before,
.hamburger::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 2px;
  background: var(--color-dark);
  transition: all 0.3s ease;
}

.hamburger::before {
  top: -8px;
}

.hamburger::after {
  top: 8px;
}

.hamburger.open {
  background: transparent;
}

.hamburger.open::before {
  top: 0;
  transform: rotate(45deg);
}

.hamburger.open::after {
  top: 0;
  transform: rotate(-45deg);
}

/* Mobile Navigation */
.mobile-nav {
  display: none;
  position: fixed;
  top: 80px;
  left: 0;
  right: 0;
  background: var(--color-white);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 16px;
  flex-direction: column;
  gap: 8px;
  transform: translateY(-20px);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 99;
}

.mobile-nav.open {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-dark);
  font-weight: 600;
  transition: all 0.2s ease;
}

.mobile-nav-item:hover {
  background: var(--color-gray-100);
}

.mobile-nav-item.router-link-active {
  background: rgba(46, 134, 171, 0.1);
  color: var(--color-secondary);
}

.mobile-nav-item .nav-icon {
  font-size: 24px;
}

/* Main Content */
.app-main {
  padding-top: 80px;
  min-height: calc(100vh - 80px);
}

/* Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.4s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Responsive */
@media (max-width: 768px) {
  .desktop-nav {
    display: none;
  }

  .mobile-toggle {
    display: block;
  }

  .mobile-nav {
    display: flex;
  }

  .logo-main {
    font-size: 20px;
  }

  .blob {
    filter: blur(40px);
  }

  .blob-1 {
    width: 250px;
    height: 250px;
  }

  .blob-2 {
    width: 200px;
    height: 200px;
  }

  .blob-3 {
    width: 150px;
    height: 150px;
  }
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-gray-100);
}

::-webkit-scrollbar-thumb {
  background: var(--color-gray-300);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-600);
}
</style>
