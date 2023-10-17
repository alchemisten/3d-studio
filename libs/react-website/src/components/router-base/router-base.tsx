import React, { FC } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { Overview, Project } from '../../views';

const MemoizedOutlet = React.memo(Outlet);

export const RouterBase: FC = () => {
  const router = createBrowserRouter([
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
  ]);

  return <RouterProvider router={router} />;
};
