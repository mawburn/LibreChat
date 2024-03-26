import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from 'test/layout-test-utils';
import AutoScrollSwitch from './AutoScrollSwitch';
import { Provider as JotaiProvider } from 'jotai';

describe('AutoScrollSwitch', () => {
  /**
   * Mock function to set the auto-scroll state.
   */
  let mockSetAutoScroll: jest.Mock<void, [boolean]> | ((value: boolean) => void) | undefined;

  beforeEach(() => {
    mockSetAutoScroll = jest.fn();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <JotaiProvider>
        <AutoScrollSwitch />
      </JotaiProvider>,
    );

    expect(getByTestId('autoScroll')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the switch is toggled', () => {
    const { getByTestId } = render(
      <JotaiProvider>
        <AutoScrollSwitch onCheckedChange={mockSetAutoScroll} />
      </JotaiProvider>,
    );
    const switchElement = getByTestId('autoScroll');
    fireEvent.click(switchElement);

    expect(mockSetAutoScroll).toHaveBeenCalledWith(true);
  });
});
