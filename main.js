#!/usr/bin/env node --harmony

const { spawn } = require('child_process');
const program = require('commander');
const asciifyPixelMatrix = require('asciify-pixel-matrix');

function chunksToRawFramesOfSize(frameWidth, frameHeight) {
  const framePixels = (frameWidth || 1) * (frameHeight || 1);
  const frameBytes = framePixels * 4; // BGRA

  return async function* chunksToRawFrames(chunks) {
    if (! Symbol.asyncIterator) {
      throw new Error('Current JavaScript engine does not support asynchronous iterables');
    }
    if (! (Symbol.asyncIterator in chunks)) {
      throw new Error('Parameter is not an asynchronous iterable');
    }
    let previous;
    for await (const chunk of chunks) {
      if (!previous)
        previous = chunk;
      else
        previous = Buffer.concat([previous, chunk]);
      while (previous.length >= frameBytes) {
        const line = previous.slice(0, frameBytes);
        yield line;
        previous = previous.slice(frameBytes);
      }
    }
    if (previous.length > 0) {
      yield previous;
    }
  }
}

function asciiFromBGRA(bgra, frameWidth) {
  // TODO: Rewrite pixel parsing as generators
}

function pixelMatrixFromBGRA(bgra, frameWidth) {
  // TODO: Get off of asciify-pixel-matrix and onto plain asciify-pixel
  let i = 0;
  let y = 0;
  let pixelMatrix = [];

  while (i < bgra.length) {
    let pixelRow = [];
    pixelMatrix.push(pixelRow);
    let x = 0;
    while (x < frameWidth) {
      let pixel = {
        r: bgra.readUInt8(i + 2),
        g: bgra.readUInt8(i + 1),
        b: bgra.readUInt8(i),
        a: 1
      };
      pixelRow.push(pixel);
      i += 4;
      x++;
    }
    y++;
  }

  return pixelMatrix;
}

async function getVideoSize(video) {
  // TODO: Make this code not trash
  const ffmpeg = spawn(
    'ffmpeg', ['-i', video],
    {
      stdio: ['ignore', 'ignore', 'pipe'],
    }
  );

  const sedSize = spawn(
    'sed', ['-nE', '/Stream.*Video/ s/, /\\\n/gp'],
    {
      stdio: [ffmpeg.stderr, 'pipe', 'ignore'],
    }
  );

  let lines = '';
  for await (const data of sedSize.stdout) {
    lines += data;
  }
  lines = lines.split(/\n/);

  const sizeRegex = /^\d+x\d+( \[)?/;
  const sizeLines = lines.filter(line => sizeRegex.test(line));

  if (sizeLines.length < 1) {
    throw new Error('Could not find video size');
  }

  const sizePieces = sizeLines[0].match(/^(\d+)x(\d+)/);

  return {w: sizePieces[1] * 1.0, h: sizePieces[2] * 1.0};
}

function getFrameSize(termSize, videoSize) {
  // Absurd rough character size math: a 1280x720 video is the same aspect ratio
  // as a macOS Terminal of size 211x51 with Monaco 10pt. Would be great to find
  // a better way to dynamically calculate this.
  const charAspect = (1280 / 720) / (211 / 51);
  const termAspect = termSize.w / termSize.h * charAspect;
  const videoAspect = videoSize.w / videoSize.h;

  const frameSize =
    (videoAspect > termAspect)
      ? { w: termSize.w, h: Math.floor(termSize.w / videoAspect * charAspect) }
      : { w: Math.floor(termSize.h * videoAspect / charAspect), h: termSize.h };

  return frameSize;
}

function decodeBGRAStream(video, frameSize) {
  const scaleCommand = `scale=${frameSize.w}x${frameSize.h}`;

  const decode = spawn(
    'ffmpeg', ['-re', '-i', video, '-vf', scaleCommand, '-f', 'rawvideo', '-pix_fmt', 'bgra', '-'],
    {
      stdio: ['ignore', 'pipe', 'ignore'],
    }
  );

  return decode;
}

function asciifyFrame(frame, width) {
  // TODO: Add options for other asciifiers
  const pixelMatrix = pixelMatrixFromBGRA(frame, width);
  const ascii = asciifyPixelMatrix(pixelMatrix);
  return ascii;
}

function writeFrameToScreen(frame) {
  process.stdout.cork();
  process.stdout.write('\033[1;1H');
  process.stdout.write(frame);
  process.stdout.uncork();
}

program
  .version('0.0.1')
  .command('play <input-video>')
  .description(
    'Takes an input video, converts it into ASCII frames, and prints them to screen'
  )
  .action(async (video) => {
    const termSize = {w: process.stdout.columns, h: process.stdout.rows};
    const videoSize = await getVideoSize(video);
    const frameSize = getFrameSize(termSize, videoSize);

    const decode = decodeBGRAStream(video, frameSize);

    const frameDechunker = chunksToRawFramesOfSize(frameSize.w, frameSize.h);

    const asciiOptions = {};

    for await (const frame of frameDechunker(decode.stdout)) {
      const asciiFrame = asciifyFrame(frame, frameSize.w);
      writeFrameToScreen(asciiFrame);
    }
  })

program.parse(process.argv)
if (!program.args.length) program.help()
