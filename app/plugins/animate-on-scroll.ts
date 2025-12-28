import type { DirectiveBinding } from 'vue'

interface AnimateOnScrollOptions {
  animation: string
  delay?: number
  threshold?: number
}

const observerMap = new WeakMap<Element, IntersectionObserver>()

const parseBinding = (binding: DirectiveBinding): AnimateOnScrollOptions => {
  if (typeof binding.value === 'string') {
    return { animation: binding.value }
  }
  return binding.value as AnimateOnScrollOptions
}

const hideElementBeforeAnimation = (element: HTMLElement): void => {
  element.style.opacity = '0'
  element.classList.add('animate-on-scroll-initial')
}

const showElementWithAnimation = (element: HTMLElement, animation: string): void => {
  element.style.opacity = ''
  element.classList.add(animation)
}

const handleIntersect = (
  entries: IntersectionObserverEntry[],
  element: HTMLElement,
  options: AnimateOnScrollOptions,
) => {
  const entry = entries[0]
  if (entry?.isIntersecting) {
    const delay = options.delay ?? 0
    if (delay > 0) {
      setTimeout(() => {
        showElementWithAnimation(element, options.animation)
      }, delay)
    }
    else {
      showElementWithAnimation(element, options.animation)
    }

    const observer = observerMap.get(element)
    if (observer) {
      observer.disconnect()
      observerMap.delete(element)
    }
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('animate-on-scroll', {
    getSSRProps() {
      return { class: 'animate-on-scroll-initial' }
    },

    created(element: HTMLElement) {
      hideElementBeforeAnimation(element)
    },

    mounted(element: HTMLElement, binding: DirectiveBinding) {
      const options = parseBinding(binding)
      const threshold = options.threshold ?? 0.1

      const observer = new IntersectionObserver(
        entries => handleIntersect(entries, element, options),
        { threshold, rootMargin: '0px 0px -50px 0px' },
      )

      observerMap.set(element, observer)
      observer.observe(element)
    },

    unmounted(element: HTMLElement) {
      const observer = observerMap.get(element)
      if (observer) {
        observer.disconnect()
        observerMap.delete(element)
      }
    },
  })
})
