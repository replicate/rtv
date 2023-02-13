import { mkdir } from "node:fs/promises";
import { Queue } from "./queue.js";
import child_process from "node:child_process";
import fs from "node:fs";

async function main() {
  await mkdir("queue", { recursive: true });

  console.log("Starting ffmpeg...");
  const ffmpeg = child_process.spawn(
    "ffmpeg",
    [
      "-fflags",
      "+discardcorrupt",
      "-re",
      "-i",
      "-",
      // https://docs.mux.com/guides/video/configure-broadcast-software#recommended-encoder-settings
      // "-b:v", "10000k",
      // "-vcodec", "h264",
      // https://trac.ffmpeg.org/wiki/Encode/H.264#LosslessH.264
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-qp",
      "0",
      // https://trac.ffmpeg.org/wiki/Encode/H.264
      "-f",
      "flv",
      process.env.RTMP_URL,
    ],
    { stdio: ["pipe", process.stdout, process.stderr] }
  );
  ffmpeg.on("error", (err) => {
    console.error("Failed to start subprocess.");
  });

  await sleep(2000);

  console.log("Starting broadcast...");
  const queue = new Queue();

  while (true) {
    await queue.load();
    if (queue.items.length === 0) {
      sleep(100);
      continue;
    }

    const item = queue.items[0];

    // todo: timeout / retry?
    if (item.prediction.status === "failed") {
      console.log("Skipping failed item", item.number);
      await queue.shift();
      continue;
    }

    // Next item in the queue is still processing... wait a bit
    if (!item.outputExists()) {
      console.log("Run out of stuff! Waiting...");
      sleep(100);
      continue;
    }

    console.log("\n\nBroadcasting", item.outputPath(), "...\n\n");
    await pipeFileToProcess(item.outputPath(), ffmpeg);
    await queue.shift();
  }
}

async function pipeFileToProcess(filePath, process) {
  // todo: ignore missing files
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(process.stdin, { end: false })
      .on("unpipe", resolve)
      .on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main();
