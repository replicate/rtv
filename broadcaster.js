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
      "-fflags", // set input flags

      "+discardcorrupt", // discard corrupted packets

      "-re", // read input at the native frame rate

      "-i", // input file or stream specifier

      "-", // input is stdin

      // "-b:v", "10000k",  // set the video bitrate to 10000 kbps
      // "-vcodec", "h264", // use the H.264 video codec

      "-c:v", // video codec to use for encoding
      "libx264", // use the libx264 codec

      "-preset", // set encoding preset
      "ultrafast", // use the ultrafast preset for fast encoding

      "-qp", // set constant quantization parameter (CQP) value
      "0", // set CQP to 0 for lossless encoding

      "-an", // remove audio from the output

      "-f", // set output format
      "flv", // use the FLV format for output

      process.env.RTMP_URL, // output file or stream specifier
    ],
    { stdio: ["pipe", process.stdout, process.stderr] }
  );
  ffmpeg.on("error", (err) => {
    console.error("Failed to start subprocess.");
  });

  await sleep(1000);

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
    if (!(await item.outputExists())) {
      console.log("Run out of stuff! Waiting...");
      sleep(1000);
      continue;
    }

    console.log("\n\nBroadcasting", item.outputPath(), "...\n\n");
    try {
      await pipeFileToProcess(item.outputPath(), ffmpeg);
    } catch (e) {
      console.error("Failed to pipe file to ffmpeg:", e);
      // Cautiously delete this item in the queue in case something weird is going on
      await queue.shift();
      break;
    }
    await queue.shift();
  }
  ffmpeg.stdin.end();
  ffmpeg.kill();
}

async function pipeFileToProcess(filePath, process) {
  // todo: ignore missing files
  return new Promise((resolve, reject) => {
    try {
      fs.createReadStream(filePath)
        .pipe(process.stdin, { end: false })
        .on("unpipe", resolve)
        .on("error", reject);
    } catch (e) {
      reject(e);
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main();
