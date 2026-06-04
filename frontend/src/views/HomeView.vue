<script setup>
import { useAuth } from '@/composables/useAuth'

const { user } = useAuth()
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-3xl bg-primitive-dark-500 p-8 text-white shadow-sm">
      <p class="text-sm font-medium uppercase tracking-[0.2em] text-primitive-orange-300">
        Área privada
      </p>
      <h1 class="mt-3 text-3xl font-bold sm:text-4xl">
        Bienvenido, {{ user?.nombre }}
      </h1>
      <p class="mt-3 max-w-2xl text-primitive-gray-500">
        Iniciaste sesión correctamente con JWT. Esta pantalla solo es accesible si el usuario está autenticado.
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <article class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 class="text-lg font-semibold text-slate-900">Sesión actual</h2>
        <div class="mt-4 space-y-3 text-sm text-slate-600">
          <p><span class="font-semibold text-slate-900">Nombre:</span> {{ user?.nombre }}</p>
          <p><span class="font-semibold text-slate-900">Email:</span> {{ user?.email }}</p>
          <p><span class="font-semibold text-slate-900">Estado:</span> {{ user?.estado }}</p>
          <p><span class="font-semibold text-slate-900">Rol global:</span> {{ user?.globalRole || 'Sin rol global' }}</p>
        </div>
      </article>

      <article class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 class="text-lg font-semibold text-slate-900">Qué ya quedó listo</h2>
        <ul class="mt-4 space-y-3 text-slate-600">
          <li>Login conectado a `POST /api/auth/login`</li>
          <li>Registro conectado a `POST /api/auth/register`</li>
          <li>Validación de sesión con `GET /api/auth/me`</li>
          <li>Protección de rutas con guard y JWT</li>
        </ul>
      </article>
    </div>
  </section>
</template>