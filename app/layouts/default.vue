<template>
  <div class="min-h-screen bg-base-100">
    <header class="navbar bg-base-200 shadow-lg">
      <div class="navbar-start">
        <NuxtLink
          to="/"
          class="btn btn-ghost text-xl"
        >
          🏠 Doma
        </NuxtLink>
      </div>
      <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1">
          <li>
            <NuxtLink
              to="/"
              class="btn btn-ghost"
            >
              Главная
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/budget"
              class="btn btn-ghost"
            >
              Бюджет
            </NuxtLink>
          </li>
        </ul>
      </div>
      <div class="navbar-end">
        <div class="dropdown dropdown-end lg:hidden">
          <div
            tabindex="0"
            role="button"
            class="btn btn-ghost"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </div>
          <ul
            tabindex="0"
            class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
          >
            <li><NuxtLink to="/">Главная</NuxtLink></li>
            <li><NuxtLink to="/budget">Бюджет</NuxtLink></li>
          </ul>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
</template>
