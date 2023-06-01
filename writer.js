import "make-promises-safe";
import { mkdir } from "node:fs/promises";
import { Queue } from "./queue.js";

const MINUTES = 60 * 1000;
const TARGET_QUEUE_LENGTH = 30 * MINUTES;
const FRAMES = 500;
const FRAME_RATE = 15;

let exit = false;

process.on("SIGINT", () => {
  console.log("Exiting...");
  exit = true;
});

async function main() {
  await mkdir("queue", { recursive: true });

  const queue = new Queue();

  while (true) {
    await queue.load();
    await queue.update();
    await queue.restartTimedOutItems();

    const queueLength = queue.totalTime();

    if (queueLength < TARGET_QUEUE_LENGTH) {
      const millisecondsToGenerate = TARGET_QUEUE_LENGTH - queueLength;
      const itemsToCreate = Math.ceil(
        millisecondsToGenerate / (1000 / FRAME_RATE) / FRAMES
      );
      console.log("Creating", itemsToCreate, "items...");
      for (let i = 0; i < itemsToCreate; i++) {
        await queue.create({ frames: FRAMES, frameRate: FRAME_RATE });
      }
    }

    if (exit) {
      break;
    }

    await sleep(1000);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main();
