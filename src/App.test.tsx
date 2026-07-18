import { render } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import App from './App';

test('renders without crashing', () => {
  render(<HashRouter><App /></HashRouter>);
});
