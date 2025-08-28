/**
 * Utility functions for hashing quiz answers
 */
// Fixed salt value - can be changed to any string
const QUIZ_SALT = 'EXL_QUIZ_SALT';

/**
 * Creates a canonical version of text (trimmed, lowercase)
 * @param {string} text The text to canonicalize
 * @returns {string} The canonical version of the text
 */
export function canonicalizeText(text) {
  return (text || '').trim().toLowerCase();
}

/**
 * Generates a SHA-256 hash and returns it as a base64 string
 * @param {string} input The input string to hash
 * @returns {Promise<string>} The base64-encoded SHA-256 hash
 */
async function sha256Base64(input) {
  try {
    // Use Node.js crypto module
    // eslint-disable-next-line global-require
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(input);
    return hash.digest('base64');
  } catch (error) {
    console.error('Error generating hash:', error);
    // Return a placeholder hash in case of error
    return 'ERROR_GENERATING_HASH';
  }
}

/**
 * Generates a hash for a quiz answer
 * @param {string} pagePath The page path
 * @param {string} questionIndex The question index
 * @param {string} answerIndex The index of the answer
 * @param {string} answerText The answer text
 * @returns {Promise<string>} The hashed answer
 */
export async function hashAnswer(
  pagePath,
  questionIndex,
  answerIndex,
  answerText,
) {
  const input = [
    pagePath,
    questionIndex || '',
    answerIndex || '',
    canonicalizeText(answerText),
    QUIZ_SALT,
  ].join('|');
  return sha256Base64(input);
}

/**
 * Process a single question and hash its answers
 * @param {Element} question The question element
 * @param {number} index The question index
 * @param {string} path The current path
 */
async function processQuestion(question, index, path) {
  if (!question || question.children.length < 4) return;

  const questionDivs = question.children;
  const correctAnswerDiv = questionDivs[3];
  const correctAnswerIndices = correctAnswerDiv.textContent.trim().split(',');
  const answersDiv = questionDivs[2];
  const answersList = answersDiv.querySelector('ol');
  const answers = answersList.querySelectorAll('li');

  const answerHashes = await Promise.all(
    correctAnswerIndices.map(async (correctAnswerIndex) => {
      const trimmedIndex = correctAnswerIndex.trim();
      const answerIdx = parseInt(trimmedIndex, 10) - 1;
      const correctAnswer =
        answerIdx >= 0 && answerIdx < answers.length
          ? answers[answerIdx].textContent || ''
          : '';

      return hashAnswer(path, index.toString(), trimmedIndex, correctAnswer);
    }),
  );

  correctAnswerDiv.textContent = answerHashes.join(',');
}

/**
 * Hashes the correct answers in quiz blocks
 * @param {Document} document The document to process
 * @param {string} path The current path
 * @returns {Promise<void>}
 */
export default async function hashQuizAnswers(document, path) {
  const quizBlocks = document.querySelectorAll('div.quiz');
  if (quizBlocks.length === 0) return;

  const promises = [];
  quizBlocks.forEach((quizBlock) => {
    // Skip the first two children (title and description) and process only the questions
    Array.from(quizBlock.children)
      .slice(2)
      .forEach((question, index) => {
        promises.push(processQuestion(question, index, path));
      });
  });

  await Promise.all(promises);
}
