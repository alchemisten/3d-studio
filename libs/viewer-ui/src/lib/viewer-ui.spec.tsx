import { render } from '@testing-library/react';

import ViewerUi from './viewer-ui';

describe('ViewerUi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ViewerUi />);
    expect(baseElement).toBeTruthy();
  });
});
