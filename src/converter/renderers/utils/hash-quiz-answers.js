/**
 * Utility functions for hashing quiz answers
 */

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
  // Fixed salt value - can be changed to any string
  const pageSalt = 'EXL_QUIZ_SALT';

  const canonicalText = canonicalizeText(answerText);
  const input = `${pagePath}|${questionIndex}|${answerIndex}|${canonicalText}|${pageSalt}`;
  return sha256Base64(input);
}

/**
 * Hashes the correct answers in quiz blocks
 * @param {Document} document The document to process
 * @param {string} path The current path
 * @returns {Promise<void>}
 */
export default async function hashQuizAnswers(document, path) {
  // Find all quiz blocks
  const quizBlocks = document.querySelectorAll('div.quiz');

  // Process each quiz block
  for (let i = 0; i < quizBlocks.length; i += 1) {
    const quizBlock = quizBlocks[i];

    // Process each question in the quiz block
    const questions = Array.from(quizBlock.children);

    for (
      let questionIndex = 0;
      questionIndex < questions.length;
      questionIndex += 1
    ) {
      const question = questions[questionIndex];

      const questionDivs = Array.from(question.children);

      // Extract correct answers
      const correctAnswerDiv = questionDivs[3];
      const correctAnswerIndices = correctAnswerDiv.textContent
        .trim()
        .split(',');

      // Get the answers list
      const answersDiv = questionDivs[2];
      const answersList = answersDiv.querySelector('ol');

      const answers = Array.from(answersList.querySelectorAll('li'));

      // Generate hashes for all correct answers
      const hashPromises = correctAnswerIndices.map(
        async (correctAnswerIndex) => {
          const trimmedIndex = correctAnswerIndex.trim();
          const correctAnswer =
            answers[parseInt(trimmedIndex, 10) - 1]?.textContent || '';
          return hashAnswer(
            path,
            questionIndex.toString(),
            trimmedIndex,
            correctAnswer,
          );
        },
      );

      // Wait for all hashes to be generated
      // eslint-disable-next-line no-await-in-loop
      const hashes = await Promise.all(hashPromises);

      // Replace the correct answer indices with the hash(es)
      correctAnswerDiv.textContent = hashes.join(',');
    }
  }
}
