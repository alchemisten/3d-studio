import React, { FC } from 'react';
import { createBrowserRouter, createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { Overview, Project } from '../../views';
import { useConfigContext } from '../../provider';

const MemoizedOutlet = React.memo(Outlet);

export const RouterBase: FC = () => {
  const { basename, router: routerConfig } = useConfigContext();
  const routes = [
    {
      element: <MemoizedOutlet />,
      children: [
        {
          element: <Overview />,
          path: '/',
        },
        {
          element: <Project />,
          path: '/view/:id',
        },
      ],
    },
  ];

  const router =
    routerConfig?.mode === 'memory'
      ? createMemoryRouter(routes, {
          ...(basename ? { basename } : {}),
          ...(routerConfig.initialEntry ? { initialEntries: [routerConfig.initialEntry] } : {}),
        })
      : createBrowserRouter(routes, basename ? { basename } : undefined);

  return <RouterProvider router={router} />;
};
