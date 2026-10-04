import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import AddNote from './AddNote';
import {createNote} from '../helpers/api-communicators';
jest.mock('../helpers/api-communicators',()=>({createNote:jest.fn()}));
function draft(){fireEvent.change(screen.getByLabelText('Title'),{target:{value:'My draft'}});fireEvent.change(screen.getByLabelText('Content'),{target:{value:'Keep this answer'}});}
afterEach(()=>jest.clearAllMocks());
test('failed save retains both fields and shows an actionable error',async()=>{createNote.mockRejectedValue(new Error('offline'));render(<AddNote addNote={jest.fn()} />);draft();fireEvent.click(screen.getByRole('button',{name:'Save note'}));await screen.findByRole('alert');expect(screen.getByLabelText('Title')).toHaveValue('My draft');expect(screen.getByLabelText('Content')).toHaveValue('Keep this answer');expect(screen.getByRole('button',{name:'Save note'})).toBeEnabled();});
test('duplicate submissions are blocked and fields clear only after success',async()=>{let resolve;createNote.mockReturnValue(new Promise(done=>{resolve=done;}));const added=jest.fn();render(<AddNote addNote={added} />);draft();fireEvent.submit(screen.getByRole('form',{name:'Create note'}));fireEvent.submit(screen.getByRole('form',{name:'Create note'}));expect(createNote).toHaveBeenCalledTimes(1);expect(screen.getByLabelText('Content')).toHaveValue('Keep this answer');expect(screen.getByRole('button',{name:'Saving note'})).toBeDisabled();resolve({notes:[]});await waitFor(()=>expect(added).toHaveBeenCalled());expect(screen.getByLabelText('Content')).toHaveValue('');});
test('blank drafts never call the API',async()=>{render(<AddNote addNote={jest.fn()} />);fireEvent.click(screen.getByRole('button',{name:'Save note'}));expect(await screen.findByRole('alert')).toHaveTextContent('Add a title');expect(createNote).not.toHaveBeenCalled();});
