(() => {
  'use strict';

  if (!window.supabase?.createClient || window.__CAMPO_RPC_CATCH_FIX__) return;
  window.__CAMPO_RPC_CATCH_FIX__ = true;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);

  window.supabase.createClient = function (...args) {
    const client = originalCreateClient(...args);
    if (!client?.rpc || client.__campoRpcCatchFixed) return client;

    const originalRpc = client.rpc.bind(client);
    client.rpc = function (...rpcArgs) {
      const result = originalRpc(...rpcArgs);

      // Supabase PostgREST builders are thenable but do not expose Promise.catch().
      // Some legacy code used .catch() directly on client.rpc(...), which throws.
      // Add a small Promise-compatible catch adapter without changing normal await behavior.
      if (result && typeof result.then === 'function' && typeof result.catch !== 'function') {
        try {
          Object.defineProperty(result, 'catch', {
            configurable: true,
            enumerable: false,
            value(onRejected) {
              return Promise.resolve(result).catch(onRejected);
            }
          });
        } catch (_) {
          // Fallback for non-extensible builders: return a Promise wrapper only in this rare case.
          return Promise.resolve(result);
        }
      }

      return result;
    };

    Object.defineProperty(client, '__campoRpcCatchFixed', {
      value: true,
      configurable: false,
      enumerable: false
    });

    return client;
  };
})();
