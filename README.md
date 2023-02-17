# RTV

## How to add prompts

Stick 'em in `prompts.json`.

## How to run it

You need to set `REPLICATE_API_TOKEN` and `RTML_URL` in your environment then run `node writer.js` and `node broadcaster.js` in separate terminals.

## How it works

Two bits:

### Writer

Writer generates tiles on Replicate. They are saved as a queue in the directory `queue` as ordered JSON files.

It will generate tiles in parallel at whatever rate is needed to keep a 5 minute buffer.

### Broadcaster

Broadcaster takes tiles in the `queue` directory and broadcasts them in order to Mux using ffmpeg. When a tile has been successfully broadcast, it gets deleted from the queue.

## Deploy

```
fly deploy
```

## Debugging

If things get stuck, you can SSH into the Fly instance and look at the queue:

```
$ fly ssh console                                                                                                                                                            !10251
Connecting to fdaa:0:690b:a7b:ad0:4:e415:2... complete
# cd src/queue
# ls -l
total 1661992
-rw-r--r-- 1 root root      3023 Feb 15 23:29 1792.json
-rw-r--r-- 1 root root  73036120 Feb 15 23:29 1792.ts
-rw-r--r-- 1 root root      3019 Feb 15 23:29 1793.json
-rw-r--r-- 1 root root  71689100 Feb 15 23:29 1793.ts
-rw-r--r-- 1 root root      3028 Feb 15 23:30 1794.json
-rw-r--r-- 1 root root  92167940 Feb 15 23:30 1794.ts
...
```
