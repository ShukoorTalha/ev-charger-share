import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';

const theme = createTheme();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const AppWrapper = ({ children }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

test('renders EvChargerShare header', () => {
  render(
    <AppWrapper>
      <App />
    </AppWrapper>
  );
  const headerElement = screen.getByRole('banner');
  expect(headerElement).toBeInTheDocument();
  expect(headerElement).toHaveTextContent('EvChargerShare');
});