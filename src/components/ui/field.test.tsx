import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './field';
import { Input } from './input';

describe('Field', () => {
  it('renders a hint and an error simultaneously with both ids in aria-describedby', () => {
    render(
      <Field label="Title" htmlFor="title" hint="Keep it short." error="Title is required.">
        <Input id="title" />
      </Field>,
    );

    const input = screen.getByLabelText('Title');
    expect(screen.getByText('Keep it short.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required.');
    expect(input).toHaveAttribute('aria-describedby', 'title-hint title-error');
  });

  it('sets aria-invalid="true" only when errored', () => {
    const { rerender } = render(
      <Field label="Title" htmlFor="title">
        <Input id="title" />
      </Field>,
    );

    expect(screen.getByLabelText('Title')).not.toHaveAttribute('aria-invalid');

    rerender(
      <Field label="Title" htmlFor="title" error="Title is required.">
        <Input id="title" />
      </Field>,
    );

    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders both the required marker and the required attribute', () => {
    render(
      <Field label="Title" htmlFor="title" required>
        <Input id="title" />
      </Field>,
    );

    const input = screen.getByLabelText(/Title/);
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders no hint or error paragraph when neither is supplied', () => {
    render(
      <Field label="Title" htmlFor="title">
        <Input id="title" />
      </Field>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Title')).not.toHaveAttribute('aria-describedby');
  });

  it('joins a caller-supplied aria-describedby with the field ids', () => {
    render(
      <Field label="Title" htmlFor="title" hint="Hint.">
        <Input id="title" aria-describedby="external" />
      </Field>,
    );

    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'aria-describedby',
      'external title-hint',
    );
  });

  it('associates the label with the control id', () => {
    render(
      <Field label="Summary" htmlFor="summary">
        <Input id="summary" />
      </Field>,
    );

    expect(screen.getByLabelText('Summary')).toHaveAttribute('id', 'summary');
  });
});
