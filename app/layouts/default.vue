<template>
  <div class="min-h-screen bg-base-100">
    <header class="navbar bg-base-200 shadow-lg">
      <div class="navbar-start">
        <NuxtLink to="/" class="btn btn-ghost text-xl">
          Doma
        </NuxtLink>
      </div>
      <div class="navbar-center">
        <ul class="menu menu-horizontal px-1">
          <li>
            <NuxtLink to="/" class="btn btn-ghost">
              Главная
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/budget" class="btn btn-ghost">
              Бюджет
            </NuxtLink>
          </li>
        </ul>
      </div>
      <div class="navbar-end"/>
    </header>

    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
</template>

