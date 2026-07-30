import { render, screen, fireEvent } from '@testing-library/react';
import TagSelect from '@/components/TagSelect';

const tags = [
  { id: '1', name: 'Tag1' },
  { id: '2', name: 'Tag2' },
];

test('renders tags and calls onChange', () => {
  const onChange = jest.fn();
  render(<TagSelect tags={tags} selected={[]} onChange={onChange} />);
  const checkbox = screen.getByLabelText('Tag1') as HTMLInputElement;
  fireEvent.click(checkbox);
  expect(onChange).toHaveBeenCalled();
});
