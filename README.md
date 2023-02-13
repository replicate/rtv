# RTV

## How to add prompts

Stick 'em in `prompts.json`.

## How to run it

You need to set `REPLICATE_API_TOKEN` and `RTML` in your environment then run `node writer.js` and `node broadcaster.js` in separate terminals.

## How it works

Two bits:

### Writer

Writer generates tiles on Replicate. They are saved as a queue in the directory `queue` as ordered JSON files.

It will generate tiles in parallel at whatever rate is needed to keep a 5 minute buffer.

### Broadcaster

Broadcaster takes tiles in the `tiles` directory and broadcasts them to Mux using ffmpeg in order. When a tile has been successfully broadcast, it gets deleted from the queue.
