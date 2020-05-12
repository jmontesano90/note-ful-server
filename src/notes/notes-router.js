const express = require('express');
const xss = require('xss');
const NotesService = require('./notes-service');
const path = require('path');

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNotes = (note) => ({
  id: note.id,
  name: note.name,
  folderid: note.folderid,
  content: note.content,
});

notesRouter
  .route('/')
  .get((req, res, next) => {
    NotesService.getAllNotes(req.app.get('db'))
      .then((notes) => {
        res.json(notes.map(serializeNotes));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { name, folderid, content } = req.body;
    const newNote = { name, folderid, content };

    for (const [key, value] of Object.entries(newNote)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key} in request body` },
        });
      }
    }
    newNote.name = name;
    NotesService.insertNote(req.app.get('db'), newNote)
      .then((note) => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNotes(note));
      })
      .catch(next);
  });

notesRouter
  .route('/:note_id')
  .all((req, res, next) => {
    NotesService.getById(req.app.get('db'), req.params.note_id)
      .then((article) => {
        if (!article) {
          return res.status(404).json({
            error: { message: `Note doesn't exist` },
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeNotes(res.note));
  })
  .delete((req, res, next) => {
    const { note_id } = req.params;
    NotesService.deleteNote(req.app.get('db'), note_id)
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { name, folderid, content } = req.body;
    const noteToUpdate = { name, folderid, content };

    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'name', 'folderid' or 'content'`,
        },
      });
    }
    NotesService.updateNote(req.app.get('db'), req.params.note_id, noteToUpdate)
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = notesRouter;
