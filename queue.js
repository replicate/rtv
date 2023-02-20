import { readdir, readFile, stat, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import fs from "node:fs";
import replicate from "./replicate-js/index.js";
import prompts from "./prompts.json" assert { type: "json" };
import util from "util";
import child_process from "child_process";
const exec = util.promisify(child_process.exec);

export class Item {
  static async create({
    number,
    promptStart,
    seedStart,
    promptEnd,
    seedEnd,
    frames,
    frameRate,
  }) {
    let item = new Item();
    item.number = number;
    item.promptStart = promptStart;
    item.seedStart = seedStart;
    item.promptEnd = promptEnd;
    item.seedEnd = seedEnd;
    item.frames = frames;
    item.frameRate = frameRate;

    await item.createPrediction();
    await item.save();
    return item;
  }

  async createPrediction() {
    this.prediction = await replicate.predictions.create({
      version:
        "a819625e6d8b1884f0c5328cec39a7296737ab9bb4d1ea1d8a31a916cafa27bf",
      input: {
        prompt_start: this.promptStart,
        seed_start: this.seedStart,
        prompt_end: this.promptEnd,
        seed_end: this.seedEnd,
        width: 1024,
        height: 768,
        num_inference_steps: 20,
        num_animation_frames: Math.floor(this.frames / 50),
        num_interpolation_steps: 50,
        frames_per_second: this.frameRate,
        seed: 1,
      },
    });
  }

  async update() {
    if (
      this.prediction.status !== "succeeded" &&
      this.prediction.status !== "failed" &&
      this.prediction.status !== "cancelled"
    ) {
      this.prediction = await replicate.predictions.get({
        id: this.prediction.id,
      });
      if (!this.prediction.id) {
        // error handling...
        return;
      }
      await this.save();
    }

    if (
      this.prediction.status === "succeeded" &&
      !(await this.outputExists())
    ) {
      await this.download();
    }
  }

  outputPath() {
    return path.join("queue", this.number + ".ts");
  }

  async outputExists() {
    try {
      await stat(this.outputPath());
    } catch (e) {
      if (e.code === "ENOENT") {
        return false;
      }
      throw e;
    }
    return true;
  }

  async download() {
    console.log("Downloading", this.number, "...");
    const mp4path = path.join("queue", this.number + ".mp4");
    await downloadFile(this.prediction.output[0], mp4path);
    await exec(
      `ffmpeg -y -i '${mp4path}' -c copy -bsf:v h264_mp4toannexb -f mpegts '${this.outputPath()}'`
    );
    await unlink(mp4path);
  }

  metadataPath() {
    return path.join("queue", this.number + ".json");
  }

  async save() {
    await writeFile(this.metadataPath(), JSON.stringify(this, null, 2));
  }

  async remove() {
    // Wrap in lots of catches to ensure we actually delete broken data
    try {
      await unlink(this.metadataPath());
    } catch (e) {
      if (e.code !== "ENOENT") {
        console.error(e);
      }
    }
    if (await this.outputExists()) {
      try {
        await unlink(this.outputPath());
      } catch (e) {
        if (e.code !== "ENOENT") {
          console.error(e);
        }
      }
    }
  }
}

export class Queue {
  constructor() {}

  async create({ frames, frameRate }) {
    let number, promptStart, seedStart;
    if (this.items.length === 0) {
      number = 0;
      promptStart = randomPrompt();
      seedStart = randomSeed();
    } else {
      const lastItem = this.items[this.items.length - 1];
      number = lastItem.number + 1;
      promptStart = lastItem.promptEnd;
      seedStart = lastItem.seedEnd;
    }
    const item = await Item.create({
      number: number,
      promptStart: promptStart,
      seedStart: seedStart,
      promptEnd: randomPrompt(),
      seedEnd: randomSeed(),
      frames: frames,
      frameRate: frameRate,
    });
    this.items.push(item);
    return item;
  }

  async load() {
    this.items = [];
    const files = await readdir("queue");
    for (const file of files) {
      if (file.endsWith(".json")) {
        let item = new Item();
        // todo: ignore missing files
        Object.assign(
          item,
          JSON.parse(await readFile(path.join("queue", file)))
        );
        this.items.push(item);
      }
    }
    this.items.sort((a, b) => a.number - b.number);
  }

  async update() {
    for (const item of this.items) {
      await item.update();
    }
  }

  async shift() {
    const item = this.items.shift();
    await item.remove();
    return item;
  }

  totalTime() {
    let time = 0;
    for (const item of this.items) {
      time += (item.frames / item.frameRate) * 1000;
    }
    return time;
  }

  async restartTimedOutItems() {
    for (const item of this.items) {
      if (item.prediction.status === "succeeded") {
        continue;
      }
      const elapsed = Date.now() - Date.parse(item.prediction.created_at);
      if (elapsed > 1000 * 60 * 5) {
        console.log("Restarting timed out item", item.number);
        await item.createPrediction();
        await item.save();
      }
    }
  }
}

function randomPrompt() {
  return prompts[Math.floor(Math.random() * prompts.length)];
}

function randomSeed() {
  return (Math.random() * 2 ** 32) | 0;
}

async function downloadFile(url, fileName) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      response
        .pipe(fs.createWriteStream(fileName))
        .on("finish", () => {
          resolve();
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  });
}
