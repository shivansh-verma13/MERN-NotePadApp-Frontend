import { vi } from "vitest";
import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import UpdateNoteDialog from './Dialog';
test('failed edit stays open with draft content for retry',async()=>{
  const close=vi.fn();const update=vi.fn().mockRejectedValue(new Error('offline'));
  render(<UpdateNoteDialog open setOpen={close} text="Original answer" title="Draft" noteID="222222222222222222222222" updateNote={update} />);
  expect(screen.getByLabelText('Content')).toHaveValue('Original answer');
  fireEvent.change(screen.getByLabelText('Content'),{target:{value:'Keep my changes'}});
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  await screen.findByRole('alert');
  expect(close).not.toHaveBeenCalled();expect(screen.getByLabelText('Content')).toHaveValue('Keep my changes');
  update.mockResolvedValue();fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  await waitFor(()=>expect(close).toHaveBeenCalledWith(false));
});


test('a stale edit retains a selectable draft, pins its revision and prevents blind retry',async()=>{
  const close=vi.fn();
  const update=vi.fn().mockRejectedValue({response:{status:409,data:{code:'NOTE_CONFLICT'}}});
  const {rerender}=render(<UpdateNoteDialog open setOpen={close} text="Original" title="Draft" noteID="note-a" expectedRevision={4} updateNote={update} />);
  fireEvent.change(screen.getByLabelText('Content'),{target:{value:'My unsaved draft'}});
  // A parent render must never silently rebase this draft to a newer revision.
  rerender(<UpdateNoteDialog open setOpen={close} text="New server content" title="Draft" noteID="note-a" expectedRevision={5} updateNote={update} />);
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('changed in another session');
  expect(update).toHaveBeenCalledWith('My unsaved draft','note-a',4);
  expect(screen.getByLabelText('Content')).toHaveValue('My unsaved draft');
  expect(screen.getByLabelText('Content')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Content')).not.toBeDisabled();
  expect(screen.getByRole('button',{name:'Save changes'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  expect(update).toHaveBeenCalledTimes(1);expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  expect(close).toHaveBeenCalledWith(false);
});
