import { render, fireEvent, waitFor } from '@testing-library/react';
import SearchBox from '@/components/SearchBox';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function renderWithProvider(ui: React.ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

test('calls onResults with empty array when input cleared', async () => {
  const onResults = jest.fn();
  renderWithProvider(<SearchBox onResults={onResults} />);
  const input = screen.getByPlaceholderText('Search articles…') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'test' } });
  fireEvent.change(input, { target: { value: '' } });
  await waitFor(() => expect(onResults).toHaveBeenCalledWith([]));
});
