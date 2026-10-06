import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import UpdateNoteDialog from './Dialog';
test('failed edit stays open with draft content for retry',async()=>{
  const close=jest.fn();const update=jest.fn().mockRejectedValue(new Error('offline'));
  render(<UpdateNoteDialog open setOpen={close} text="Original answer" title="Draft" noteID="222222222222222222222222" updateNote={update} />);
  expect(screen.getByLabelText('Content')).toHaveValue('Original answer');
  fireEvent.change(screen.getByLabelText('Content'),{target:{value:'Keep my changes'}});
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  await screen.findByRole('alert');
  expect(close).not.toHaveBeenCalled();expect(screen.getByLabelText('Content')).toHaveValue('Keep my changes');
  update.mockResolvedValue();fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  await waitFor(()=>expect(close).toHaveBeenCalledWith(false));
});
