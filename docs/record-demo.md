# Re-making the demo videos

The GIFs and the MP4 in `docs/media` are not screen recordings made by hand. A script starts a headless Chrome, logs in, types messages and drags Mark with real mouse events, and saves the browser's screencast frames. A second script turns the frames into an MP4 and one small GIF per scene.

No npm packages are needed: the scripts use Node 22+ (built-in `fetch` and `WebSocket`), Google Chrome and `ffmpeg`.

## You need

- Node 22 or newer, `ffmpeg`, and Google Chrome (the path is for macOS; change it at the top of `record.cjs` for other systems)
- the backend running, and a user `demo@example.test` with password `demo-pass-1234` registered in your local auth service
- for the agent scenes: the backend started with its MCP tools on, and a folder with a sample resume as its allowed folder

## Record and encode

```bash
mkdir -p /tmp/mark-rec

# part 1: Mark's reactions, dragging and the bin (uses the Chat agent)
APP=http://localhost:5173 OUT=/tmp/mark-rec/part1 node docs/demo/record.cjs
OUT=/tmp/mark-rec/part1 DEST=docs/media MP4=part1.mp4 node docs/demo/encode.cjs

# part 2: the Troubleshoot and Interview agents (waiting for the model is sped up)
PART=agents APP=http://localhost:5173 OUT=/tmp/mark-rec/part2 node docs/demo/record.cjs
OUT=/tmp/mark-rec/part2 DEST=docs/media MP4=part2.mp4 node docs/demo/encode.cjs

# glue the two parts into mark-demo.mp4
printf "file 'part1.mp4'\nfile 'part2.mp4'\n" > docs/media/parts.txt
ffmpeg -f concat -safe 0 -i docs/media/parts.txt -c copy docs/media/mark-demo.mp4
rm docs/media/parts.txt docs/media/part1.mp4 docs/media/part2.mp4
```

Each scene has a name in `record.cjs` (`01-hello`, `02-cute`, ...) and becomes `docs/media/<name>.gif`. Change the messages in the scene list to record something else.
