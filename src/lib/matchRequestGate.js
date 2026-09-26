/** Per-route in-flight ownership, shared by initial loading and detail polling. */
export function createMatchRequestGate() {
  let active = null;
  return {
    begin(route) {
      if (active?.route === route) return null;
      const token = { route };
      active = token;
      return token;
    },
    finish(token) {
      // An older route or aborted StrictMode request cannot release a newer one.
      if (active === token) active = null;
    },
  };
}
