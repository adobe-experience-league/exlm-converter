import { toBlock } from '../utils/dom-utils.js';

const getDecorateImgConfig = (img) => {
  let className = '';
  if (img?.align) {
    className += ` ${img.align}-align`;
  }
  if (img?.width) {
    className += ` w-${img.width}`;
  }
  if (img?.className?.includes('modal-image')) {
    className += ` modal-image`;
  }
  return {
    canDecorate: !!className,
    className,
  };
};

export default function createImgBlock(document) {
  const imgElements = Array.from(document.querySelectorAll('img'));
  imgElements.forEach((imgElement) => {
    const { canDecorate, className } = getDecorateImgConfig(imgElement);
    if (canDecorate) {
      const img = document.createElement('img');
      if (imgElement.className) {
        const existingClassNames = imgElement.className.split(' ');
        img.classList.add(...existingClassNames);
      }
      const newClassNamesList = className.trim().split(' ');
      //   img.classList.add(...newClassNamesList);
      img.src = imgElement.src;
      img.title = imgElement.title;
      img.alt = imgElement.alt;
      const cells = [[img]];
      const block = toBlock(
        `img ${newClassNamesList.join(' ')}`,
        cells,
        document,
      );
      imgElement.parentElement.replaceChild(block, imgElement);
    }
  });
}
