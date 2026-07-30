"use client";
import { Switch } from '@headlessui/react';

interface StatusToggleProps {
  status: 'DRAFT' | 'PUBLISHED';
  onChange: (status: 'DRAFT' | 'PUBLISHED') => void;
}

export default function StatusToggle({ status, onChange }: StatusToggleProps) {
  const enabled = status === 'PUBLISHED';
  return (
    <Switch
      checked={enabled}
      onChange={checked => onChange(checked ? 'PUBLISHED' : 'DRAFT')}
      className={`$${enabled ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full`}
    >
      <span
        className={`$${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}
      />
    </Switch>
  );
}
