import { vi } from "vitest";
import React from 'react';
import {act,render,screen,fireEvent,waitFor} from '@testing-library/react';
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

function deferredComparison() {
  let resolve;
  const promise=new Promise(done=>{resolve=done;});
  return {promise,resolve};
}
const staleFailure={response:{status:409,data:{code:'NOTE_CONFLICT'}}};

test('comparison requires an explicit edit choice and preserves the draft',async()=>{
  const update=vi.fn().mockRejectedValueOnce(staleFailure).mockResolvedValueOnce();
  const load=vi.fn().mockResolvedValueOnce({title:'Renamed remotely',content:'Other owner-session edit',revision:5});
  render(<UpdateNoteDialog open setOpen={vi.fn()} text="Original" title="Draft" noteID="note-a" expectedRevision={4} updateNote={update} loadLatestNote={load} />);
  fireEvent.change(screen.getByLabelText('Content'),{target:{value:'My unsaved draft'}});
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  await screen.findByRole('alert');
  expect(load).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Compare latest saved note'}));
  expect(await screen.findByLabelText('Latest saved content')).toHaveValue('Other owner-session edit');
  expect(screen.getByLabelText('Latest saved title')).toHaveValue('Renamed remotely');
  expect(screen.getByLabelText('Latest saved content')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Content')).toHaveValue('My unsaved draft');
  expect(screen.getByRole('button',{name:'Save changes'})).toBeDisabled();
  expect(update).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Continue editing my draft'}));
  expect(screen.getByLabelText('Content')).not.toHaveAttribute('readonly');
  expect(screen.getByLabelText('Content')).toHaveFocus();
  expect(update).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('Content'),{target:{value:'Manually combined changes'}});
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Save changes'})));
  expect(update).toHaveBeenLastCalledWith('Manually combined changes','note-a',5);
});

test('a further conflict locks the new draft and requires a fresh comparison',async()=>{
  const update=vi.fn().mockRejectedValue(staleFailure);
  const load=vi.fn().mockResolvedValueOnce({title:'Draft',content:'New saved content',revision:5})
    .mockResolvedValueOnce({title:'Draft',content:'Even newer edit',revision:6});
  render(<UpdateNoteDialog open setOpen={vi.fn()} text="Original" title="Draft" noteID="note-a" expectedRevision={4} updateNote={update} loadLatestNote={load} />);
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Save changes'})));
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Compare latest saved note'})));
  fireEvent.click(screen.getByRole('button',{name:'Continue editing my draft'}));
  fireEvent.change(screen.getByLabelText('Content'),{target:{value:'Manually combined changes'}});
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Save changes'})));
  expect(screen.getByLabelText('Content')).toHaveValue('Manually combined changes');
  expect(screen.queryByLabelText('Latest saved content')).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Save changes'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Compare latest saved note'}));
  expect(await screen.findByLabelText('Latest saved content')).toHaveValue('Even newer edit');
  expect(update).toHaveBeenLastCalledWith('Manually combined changes','note-a',5);
  expect(screen.getByRole('button',{name:'Save changes'})).toBeDisabled();
});

test('failed and missing comparison reads retain the draft and never enable a write',async()=>{
  const load=vi.fn().mockRejectedValueOnce(new Error('Synthetic outage')).mockResolvedValueOnce(null);
  render(<UpdateNoteDialog open setOpen={vi.fn()} text="Keep this" title="Draft" noteID="note-a" updateNote={vi.fn().mockRejectedValue(staleFailure)} loadLatestNote={load} />);
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button',{name:'Compare latest saved note'}));
  await screen.findByText(/latest note could not be loaded/);
  expect(screen.getByLabelText('Content')).toHaveValue('Keep this');
  fireEvent.click(screen.getByRole('button',{name:'Compare latest saved note'}));
  await screen.findByText(/no longer available/);
  expect(screen.getByLabelText('Content')).toHaveValue('Keep this');
  expect(screen.getByRole('button',{name:'Save changes'})).toBeDisabled();
  expect(screen.queryByRole('button',{name:'Continue editing my draft'})).not.toBeInTheDocument();
});

test.each(['close','unmount'])('comparison prevents duplicate reads and cancels on %s, ignoring late responses',async(action)=>{
  const response=deferredComparison();const load=vi.fn().mockReturnValue(response.promise);const close=vi.fn();
  const view=render(<UpdateNoteDialog open setOpen={close} text="Private draft" title="Draft" noteID="note-a" updateNote={vi.fn().mockRejectedValue(staleFailure)} loadLatestNote={load} />);
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));await screen.findByRole('alert');
  const compare=screen.getByRole('button',{name:'Compare latest saved note'});
  fireEvent.click(compare);fireEvent.click(compare);
  expect(load).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status')).toHaveTextContent('Loading the latest');
  const signal=load.mock.calls[0][1];expect(signal.aborted).toBe(false);
  if(action==='close')fireEvent.click(screen.getByRole('button',{name:'Cancel'}));else view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async()=>response.resolve({title:'Late secret',content:'Must not appear',revision:3}));
  await waitFor(()=>expect(screen.queryByLabelText('Latest saved content')).not.toBeInTheDocument());
  if(action==='close')expect(close).toHaveBeenCalledWith(false);
});
