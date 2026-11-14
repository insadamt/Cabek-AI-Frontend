/** Verify the actual Vite settings proxy preserves the loopback access boundary.
 * Depends on the config middleware and mock HTTP objects; no network is opened. */
import { describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin, ViteDevServer } from 'vite';
import configure from '../../vite.config';

function proxyGuard() {
  const config = configure({ command: 'serve', mode: 'test' });
  const plugin = config.plugins?.find(
    (item): item is Plugin =>
      !!item && typeof item === 'object' && 'name' in item && item.name === 'local-settings-access',
  );
  if (!plugin || typeof plugin.configureServer !== 'function') {
    throw new Error('Local settings guard is missing');
  }
  let guard: Connect.NextHandleFunction | undefined;
  const configureServer = plugin.configureServer;
  configureServer.call(
    {} as ThisParameterType<typeof configureServer>,
    {
      middlewares: {
        use: (middleware: Connect.NextHandleFunction) => {
          guard = middleware;
        },
      },
    } as ViteDevServer,
  );
  if (!guard) throw new Error('Local settings guard was not registered');
  return guard;
}

describe('settings proxy boundary', () => {
  it.each(['/api/settings/lights/set', '/api/settings/lights/off', '/api/settings%2flights/off'])(
    'blocks LAN access to %s',
    (url) => {
      const next = vi.fn();
      const end = vi.fn();
      const response = { statusCode: 200, end };
      proxyGuard()(
        { url, socket: { remoteAddress: '192.168.1.20' } } as IncomingMessage,
        response as unknown as ServerResponse,
        next,
      );
      expect(response.statusCode).toBe(403);
      expect(end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    },
  );
  it('allows a loopback settings request and leaves ordinary LAN application routes accessible', () => {
    const next = vi.fn();
    const guard = proxyGuard();
    guard(
      {
        url: '/api/settings/lights/set',
        socket: { remoteAddress: '::ffff:127.0.0.1' },
      } as IncomingMessage,
      {} as ServerResponse,
      next,
    );
    guard(
      { url: '/api/dossiers', socket: { remoteAddress: '192.168.1.20' } } as IncomingMessage,
      {} as ServerResponse,
      next,
    );
    expect(next).toHaveBeenCalledTimes(2);
  });
});
