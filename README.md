# RTV

Broadcasting the latest and greatest generative AI, direct to your web browser.

<img width="1511" alt="Screenshot 2023-02-20 at 21 14 51" src="https://user-images.githubusercontent.com/40906/220253777-cde3e00c-8410-4ea7-9de2-812d3391d027.png">

RTV takes a series of prompts and feeds them through [andreasjansson/tile-morph](https://replicate.com/andreasjansson/tile-morph) to create a tiled animation drifting through latent space.

It is broadcast on [the Replicate home page](https://replicate.com/home). If you want to edit our home page, contribute some prompts!

## How to add prompts

Stick 'em in `prompts.json`.

## How to run it

You need to set `REPLICATE_API_TOKEN` and `RTMP_URL` in your environment then run `node writer.js` and `node broadcaster.js` in separate terminals.

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

## Fix it when it breaks

`fly logs` will tell you what broke.

`fly apps restart rtv` might fix it.
