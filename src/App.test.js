import React from 'react';
import { render } from '@testing-library/react-native';
import App from './App';

describe('App Component', () => {
  it('should render without crashing', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId).toBeDefined();
  });
});
