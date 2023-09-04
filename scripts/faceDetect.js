// Import CV
/** @type {any | null} */
let cv = null;
await /** @type {Promise<void>} */(new Promise(resolve =>
  // @ts-ignore
  requirejs(["lib/opencv.js"], (/** @type {any} */ cvImport) => {
    cvImport.onRuntimeInitialized = () => {
      // seems to completely hang if cv is directly resolved?
      // profiling says that opencv.js is spamming `Module.then` 
      cv = cvImport;
      resolve();
    }
  })
));

if (cv === null)
  throw new Error('CV import failed');

console.info(cv.getBuildInformation());

// Load Cascade Classifier
const faceClassifier = await (async () => {
  const file = 'haarcascade_frontalface_default.xml';
  cv.FS_createDataFile(
    '/', // path
    file, // file name
    // data
    new Uint8Array(await (await fetch(`/lib/${file}`)).arrayBuffer()),
    true, // allow read
    false, // allow write
    false // allow own
  );

  const faceClassifier = new cv.CascadeClassifier();
  faceClassifier.load(`/${file}`);
  return faceClassifier;
})();

/**
 * @typedef {{
*   x: number,
*   y: number,
*   width: number,
*   height: number,
* }} FaceBox
*/

/**
 * @param {ImageData} imageData 
 * @returns {FaceBox[]}
 */
export function getFaces(imageData) {
  const cvImageData = cv.matFromImageData(imageData);

  const faceVector = new cv.RectVector();
  faceClassifier.detectMultiScale(cvImageData, faceVector, 1.1, 3, 0);

  let faces = [];
  for (let i = 0; i < faceVector.size(); ++i) {
    faces.push(faceVector.get(i));
  }

  let faceBoxes = faces.map(face => /** @type {FaceBox} */({
    x: face.x,
    y: face.y,
    width: face.width,
    height: face.height,
  }));

  return faceBoxes;
}

