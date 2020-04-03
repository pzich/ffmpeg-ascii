# ffmpeg-ascii
`ffmpeg-ascii` takes an input video, converts it into ASCII frames, and prints them to screen.

![](https://i.imgur.com/V7nvQe7.gif)

The GIF won't embed properly, so go see it at https://i.imgur.com/V7nvQe7.gif for now.

### Installation

Try it for yourself, clone this repo and `yarn install` or `npm install`.

You also need to have the `ffmpeg` executable installed.
If you don't have it, be sure to [install ffmpeg](https://www.google.com/search?q=install%20ffmpeg) first.

### Backstory
*I initially started by looking at [ASCII-Video](https://github.com/fossage/ASCII-Video) as a way
to play videos in the terminal, but it is designed to pre-process all of the frames and store them
in an inefficent data format. After pulling bits of it apart I was left with `asciify-pixel` and
`commander` as dependencies.*
