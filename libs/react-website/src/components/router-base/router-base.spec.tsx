/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { ConfigProvider } from '../../provider';
import { RouterBase } from './router-base';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    createBrowserRouter: jest.fn(actual.createBrowserRouter),
    createMemoryRouter: jest.fn(actual.createMemoryRouter),
  };
});

jest.mock('../../views', () => ({
  Overview: () => <div>overview-view</div>,
  Project: () => {
    const { useParams } = jest.requireActual('react-router-dom');
    const { id } = useParams();
    return <div>project-view:{id}</div>;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createBrowserRouter, createMemoryRouter } = require('react-router-dom');
const createBrowserRouterSpy = createBrowserRouter as jest.Mock;
const createMemoryRouterSpy = createMemoryRouter as jest.Mock;

describe('RouterBase', () => {
  beforeEach(() => {
    createBrowserRouterSpy.mockClear();
    createMemoryRouterSpy.mockClear();
  });

  it('uses the browser router by default', async () => {
    render(
      <ConfigProvider config={{ baseUrl: 'http://localhost' }}>
        <RouterBase />
      </ConfigProvider>,
    );

    expect(createBrowserRouterSpy).toHaveBeenCalledTimes(1);
    expect(createMemoryRouterSpy).not.toHaveBeenCalled();
    expect(await screen.findByText('overview-view')).toBeTruthy();
  });

  it('renders the project view for the initial entry in memory mode', async () => {
    render(
      <ConfigProvider
        config={{
          baseUrl: 'http://localhost',
          router: { initialEntry: '/view/eurotec-move', mode: 'memory' },
        }}
      >
        <RouterBase />
      </ConfigProvider>,
    );

    expect(createMemoryRouterSpy).toHaveBeenCalledTimes(1);
    expect(createBrowserRouterSpy).not.toHaveBeenCalled();
    expect(await screen.findByText('project-view:eurotec-move')).toBeTruthy();
  });
});
