# Games live here.

One folder per game, `games/<slug>/`, with an `index.html` in it and optionally a
`game.json`:

```json
{ "title": "Snake", "author": "yourgithubname", "genre": "arcade" }
```

The build globs this directory, so a new folder is all it takes to appear on the site.
Nothing in here is shared between games — see `AGENTS.md`.
