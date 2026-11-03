import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import '../../../samples/styles';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '3D Studio on TanStack Start' },
    ],
  }),
  component: () => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body style={{ margin: 0, height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
