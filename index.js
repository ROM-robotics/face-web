// @ts-check
'use strict';



/**
 * @template {new (...args: any[]) => any} ObjectConstructor
 * @param {any} inputObject
 * @param {ObjectConstructor} objectType
 * @returns {InstanceType<ObjectConstructor>}
 */
function verifyObjectInstance(inputObject, objectType) {
  if (inputObject instanceof objectType) return inputObject;
  throw new TypeError(`Object instance check failed\n\n${inputObject} isn't ${objectType}\n`);
}

/**
 * @typedef {{
 *   faceBox: import('./scripts/faceDetect.js').FaceBox,
 *   emotion: string,
 * }} FaceBoxEmotion
 */

class EmotionsVisualiser {
  #video;
  #emotionBoxesDiv;

  /**
   * @param {HTMLVideoElement} video
   * @param {HTMLDivElement} emotionBoxesContainer
   */
  constructor(video, emotionBoxesContainer) {
    this.#video = video;
    this.#emotionBoxesDiv = emotionBoxesContainer;
    this.#video.addEventListener('resize', e => {
      this.#emotionBoxesDiv.style.width = this.#video.clientWidth.toString();
      this.#emotionBoxesDiv.style.height = this.#video.clientHeight.toString();
    });
  }

  /**
   * @param {MediaProvider | null} media 
   */
  async playMedia(media) {
    this.#video.srcObject = media;
    await this.#video.play();
  }

  async waitVideoFrame() {
    // Wait for video to play
    if (this.#video.videoWidth === 0)
      await /** @type {Promise<void>} */(new Promise(resolve => {
        let video = this.#video;
        function onPlaying() {
          video.removeEventListener('playing', onPlaying);
          resolve();
        }
        this.#video.addEventListener('playing', onPlaying);
      }));

    return this.#video;
  }

  /**
   * @param {FaceBoxEmotion[]} emotions
   */
  displayEmotions(emotions) {
    const createEmotionBox = (/** @type {FaceBoxEmotion} */ emotion) => {
      // create box, set location and size
      const emotionBox = document.createElement('div');
      emotionBox.style.left = `${(emotion.faceBox.x / this.#video.videoWidth) * 100}%`;
      emotionBox.style.top = `${(emotion.faceBox.y / this.#video.videoHeight) * 100}%`;
      emotionBox.style.width = `${(emotion.faceBox.width / this.#video.videoWidth) * 100}%`;
      emotionBox.style.height = `${(emotion.faceBox.height / this.#video.videoHeight) * 100}%`;

      // append label to box
      const emotionLabel = document.createElement('p');
      emotionLabel.innerText = emotion.emotion;
      emotionBox.appendChild(emotionLabel);

      return emotionBox;
    }

    // turn emotions array to html emotion boxes
    const emotionBoxes = emotions.map(emotion => createEmotionBox(emotion));

    // update emotion boxes in document
    this.#emotionBoxesDiv.innerHTML = '';
    this.#emotionBoxesDiv.append(...emotionBoxes)
  }
}

const emotionsVisualiser = new EmotionsVisualiser(
  verifyObjectInstance(document.getElementById('fullImage'), HTMLVideoElement),
  verifyObjectInstance(document.getElementById('emotionBoxesContainer'), HTMLDivElement)
);

// Update video to either stream or camera
document.addEventListener('keydown', async e => {
  /** @type {MediaProvider | null} */
  let media = null;
  switch (e.key) {
    case 's': {
      media = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      break;
    }
    case 'c': {
      media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      break;
    }
  }

  if (media === null) return;
  emotionsVisualiser.playMedia(media);
});

import { getFaces } from './scripts/faceDetect.js';
import { getEmotions } from './scripts/emotionDetect.js';

{
  // For getting ImageData from the video, optimised for reading frequently
  let frameCanvas = document.createElement('canvas');
  let frameCanvasCtx = verifyObjectInstance(
    frameCanvas.getContext('2d', { willReadFrequently: true }),
    CanvasRenderingContext2D
  );

  async function getImageData() {
    const video = await emotionsVisualiser.waitVideoFrame();

    frameCanvas.width = video.videoWidth;
    frameCanvas.height = video.videoHeight;

    // Draw video onto canvas and extract ImageData
    frameCanvasCtx.drawImage(video, 0, 0);
    return frameCanvasCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
  }

  while (true) {
    const imgData = await getImageData();

    let faceBoxes = getFaces(imgData);
    // if (faceBoxes.length > 0) {
    //   let imagedata = ctx.getImageData(faceBoxes[0].x, faceBoxes[0].y, faceBoxes[0].width, faceBoxes[0].height);
    //   let canvas = document.createElement('canvas');
    //   let boxctx = canvas.getContext('2d');
    //   canvas.width = imagedata.width;
    //   canvas.height = imagedata.height;
    //   boxctx.putImageData(imagedata, 0, 0);
    // 
    //   console.log(canvas.toDataURL());
    // }

    emotionsVisualiser.displayEmotions(
      faceBoxes.map(
        faceBox => ({
          emotion: 'unknown',
          faceBox,
        })
      )
    );

    await new Promise(resolve => {
      setTimeout(() => resolve(null), 1000)
    });
  }
}

export { }