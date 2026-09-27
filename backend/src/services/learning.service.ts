import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";

export async function listVocabulary(languageCode: string) {
  return prisma.vocabulary.findMany({
    where: { languageCode },
    orderBy: { difficulty: "asc" },
  });
}

export async function listFlashcards(languageCode: string) {
  return prisma.flashcard.findMany({
    where: { vocabulary: { languageCode } },
    include: { vocabulary: true },
  });
}

export async function recordFlashcardReview(
  userId: string,
  flashcardId: string,
  result: "correct" | "incorrect",
) {
  const flashcard = await prisma.flashcard.findUnique({ where: { id: flashcardId } });
  if (!flashcard) throw new AppError("Flashcard not found", 404);

  const progress = await prisma.flashcardProgress.upsert({
    where: { userId_flashcardId: { userId, flashcardId } },
    update: { timesReviewed: { increment: 1 }, lastResult: result, reviewedAt: new Date() },
    create: { userId, flashcardId, timesReviewed: 1, lastResult: result },
  });

  if (result === "correct") {
    await bumpProgress(userId, { xp: 5 });
  }

  return progress;
}

export async function listQuizzes(languageCode: string) {
  const quizzes = await prisma.quiz.findMany({ where: { languageCode } });
  // Never leak the correct answer in the question payload
  return quizzes.map(({ correctAnswer: _correctAnswer, ...rest }) => ({
    ...rest,
    options: JSON.parse(rest.options) as string[],
  }));
}

export async function submitQuizAnswer(userId: string, quizId: string, selectedAnswer: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new AppError("Quiz not found", 404);

  const isCorrect = quiz.correctAnswer === selectedAnswer;

  const result = await prisma.quizResult.create({
    data: { userId, quizId, selectedAnswer, isCorrect },
  });

  await bumpProgress(userId, { xp: isCorrect ? 10 : 0, quizCompleted: true });

  return {
    ...result,
    isCorrect,
    correctAnswer: quiz.correctAnswer,
    explanation: quiz.explanation,
  };
}

async function bumpProgress(userId: string, opts: { xp: number; quizCompleted?: boolean }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.learningProgress.findUnique({ where: { userId } });

  if (!existing) {
    await prisma.learningProgress.create({
      data: {
        userId,
        xpPoints: opts.xp,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
        quizzesCompleted: opts.quizCompleted ? 1 : 0,
      },
    });
    return;
  }

  let currentStreak = existing.currentStreak;
  const last = existing.lastActivityDate ? new Date(existing.lastActivityDate) : null;
  if (last) {
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) currentStreak += 1;
    else if (diffDays > 1) currentStreak = 1;
    // diffDays === 0 (same day) -> streak unchanged
  } else {
    currentStreak = 1;
  }

  await prisma.learningProgress.update({
    where: { userId },
    data: {
      xpPoints: { increment: opts.xp },
      currentStreak,
      longestStreak: Math.max(existing.longestStreak, currentStreak),
      lastActivityDate: today,
      quizzesCompleted: opts.quizCompleted
        ? { increment: 1 }
        : undefined,
    },
  });
}

export async function getProgress(userId: string) {
  const progress = await prisma.learningProgress.findUnique({ where: { userId } });
  return (
    progress ?? {
      userId,
      xpPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      wordsLearned: 0,
      quizzesCompleted: 0,
      lastActivityDate: null,
    }
  );
}
