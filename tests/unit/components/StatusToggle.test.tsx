import { render, screen, fireEvent } from '@testing-library/react';
import StatusToggle from '@/components/StatusToggle';

ntest('toggles status and calls onChange', () => {
  const onChange = jest.fn();
  render(<StatusToggle status='DRAFT' onChange={onChange} />);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  expect(onChange).toHaveBeenCalled();
});
