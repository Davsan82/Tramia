/**
 * Analytics tracking helper for the course tracking endpoint.
 */

declare global {
  interface Window {
    gtag?: (
      command: 'event',
      eventName: string,
      parameters?: Record<string, unknown>
    ) => void;
  }
}

// Generate or retrieve a persistent anonymous user ID
const getAnonymousUserId = (): string => {
  if (typeof window === 'undefined') return 'anonymous';
  let userId = localStorage.getItem('tramia_anonymous_user_id');
  if (!userId) {
    userId = 'u_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('tramia_anonymous_user_id', userId);
  }
  return userId;
};

export async function trackEvent(eventName: string, properties?: Record<string, any>) {
  try {
    const anonId = getAnonymousUserId();

    // Send the same event to Google Analytics 4 when gtag is available.
    if (typeof window !== 'undefined') {
      window.gtag?.('event', eventName, properties || {});
    }

    // El endpoint académico anterior fue desactivado porque requería publicar
    // una X-API-Key en el navegador. Si se vuelve a necesitar, debe invocarse
    // mediante una función del servidor que conserve la credencial en secreto.
    void anonId;
  } catch (e) {
    console.warn("track failed", eventName, e);
  }
}
