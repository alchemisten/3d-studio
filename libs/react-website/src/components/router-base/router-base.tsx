import React, { FC } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { Overview, Project } from '../../views';
import { useConfigContext } from '../../provider';

const MemoizedOutlet = React.memo(Outlet);

export const RouterBase: FC = () => {
  const { basename } = useConfigContext();
  const router = createBrowserRouter(
    [
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
    ],
    basename ? { basename } : undefined,
  );

  return <RouterProvider router={router} />;
};
