import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const languages = [
    { languageName: "English", languageCode: "en", nativeName: "English", direction: "LTR" },
    { languageName: "Tamil", languageCode: "ta", nativeName: "தமிழ்", direction: "LTR" },
    { languageName: "Hindi", languageCode: "hi", nativeName: "हिन्दी", direction: "LTR" },
    { languageName: "Telugu", languageCode: "te", nativeName: "తెలుగు", direction: "LTR" },
    { languageName: "Kannada", languageCode: "kn", nativeName: "ಕನ್ನಡ", direction: "LTR" },
    { languageName: "Malayalam", languageCode: "ml", nativeName: "മലയാളം", direction: "LTR" },
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { languageCode: lang.languageCode },
      update: {},
      create: lang,
    });
  }

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const plans = [
    {
      tier: "FREE" as const,
      name: "Free",
      priceCents: 0,
      dailyTranslationLimit: 20,
      features: JSON.stringify(["20 translations/day", "Text translation", "Basic OCR"]),
      stripePriceId: null,
    },
    {
      tier: "PRO" as const,
      name: "Pro",
      priceCents: 999,
      dailyTranslationLimit: null,
      features: JSON.stringify([
        "Unlimited translations",
        "Speech-to-text & text-to-speech",
        "Document translation",
        "Priority processing",
      ]),
      stripePriceId: process.env.STRIPE_PRICE_ID_PRO ?? null,
    },
    {
      tier: "ENTERPRISE" as const,
      name: "Enterprise",
      priceCents: 4999,
      dailyTranslationLimit: null,
      features: JSON.stringify([
        "Everything in Pro",
        "Team workspace (coming soon)",
        "Dedicated support",
        "Custom usage analytics",
      ]),
      stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? null,
    },
  ];

  const planRecords: Record<string, { id: string }> = {};
  for (const plan of plans) {
    const record = await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        dailyTranslationLimit: plan.dailyTranslationLimit,
        features: plan.features,
        stripePriceId: plan.stripePriceId,
      },
      create: plan,
    });
    planRecords[plan.tier] = record;
  }

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@linguaverse.ai" },
    update: { role: "ADMIN" },
    create: {
      fullName: "Admin User",
      username: "admin",
      email: "admin@linguaverse.ai",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      preferredLanguage: "en",
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@linguaverse.ai" },
    update: {},
    create: {
      fullName: "Demo User",
      username: "demo_user",
      email: "demo@linguaverse.ai",
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      emailVerified: true,
      preferredLanguage: "en",
    },
  });

  // Everyone starts on the FREE plan until they upgrade via Stripe checkout
  for (const user of [adminUser, demoUser]) {
    await prisma.userSubscription.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, planId: planRecords.FREE.id, status: "ACTIVE" },
    });
  }

  // ── Learning module seed data (Tamil, matching the spec's regional focus) ──
  const vocabWords: {
    word: string;
    languageCode: string;
    meaning: string;
    example: string;
    pronunciation: string;
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  }[] = [
    {
      word: "வணக்கம்",
      languageCode: "ta",
      meaning: "Hello / Greetings",
      example: "வணக்கம், எப்படி இருக்கிறீர்கள்?",
      pronunciation: "vanakkam",
      difficulty: "BEGINNER",
    },
    {
      word: "நன்றி",
      languageCode: "ta",
      meaning: "Thank you",
      example: "உங்கள் உதவிக்கு நன்றி.",
      pronunciation: "nandri",
      difficulty: "BEGINNER",
    },
    {
      word: "தண்ணீர்",
      languageCode: "ta",
      meaning: "Water",
      example: "எனக்கு தண்ணீர் வேண்டும்.",
      pronunciation: "thanneer",
      difficulty: "BEGINNER",
    },
    {
      word: "புத்தகம்",
      languageCode: "ta",
      meaning: "Book",
      example: "இது ஒரு நல்ல புத்தகம்.",
      pronunciation: "puthagam",
      difficulty: "INTERMEDIATE",
    },
    {
      word: "அரசாங்கம்",
      languageCode: "ta",
      meaning: "Government",
      example: "அரசாங்கம் புதிய திட்டத்தை அறிவித்தது.",
      pronunciation: "arasaangam",
      difficulty: "ADVANCED",
    },
  ];

  const vocabRecords = [];
  for (const v of vocabWords) {
    const existing = await prisma.vocabulary.findFirst({
      where: { word: v.word, languageCode: v.languageCode },
    });
    const record =
      existing ??
      (await prisma.vocabulary.create({
        data: v,
      }));
    vocabRecords.push(record);

    const existingFlashcard = await prisma.flashcard.findFirst({
      where: { vocabularyId: record.id },
    });
    if (!existingFlashcard) {
      await prisma.flashcard.create({
        data: { vocabularyId: record.id, front: v.word, back: v.meaning, category: "Basics" },
      });
    }
  }

  const quizzes: {
    languageCode: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  }[] = [
    {
      languageCode: "ta",
      question: 'What does "வணக்கம்" mean?',
      options: ["Goodbye", "Hello", "Sorry", "Please"],
      correctAnswer: "Hello",
      explanation: '"வணக்கம்" (vanakkam) is the standard Tamil greeting, used for both hello and goodbye.',
      difficulty: "BEGINNER",
    },
    {
      languageCode: "ta",
      question: 'How do you say "Thank you" in Tamil?',
      options: ["நன்றி", "தண்ணீர்", "புத்தகம்", "வணக்கம்"],
      correctAnswer: "நன்றி",
      explanation: '"நன்றி" (nandri) means "thank you".',
      difficulty: "BEGINNER",
    },
    {
      languageCode: "ta",
      question: 'What does "தண்ணீர்" mean?',
      options: ["Fire", "Water", "Earth", "Air"],
      correctAnswer: "Water",
      explanation: '"தண்ணீர்" (thanneer) means "water".',
      difficulty: "BEGINNER",
    },
  ];

  for (const q of quizzes) {
    const existing = await prisma.quiz.findFirst({
      where: { question: q.question, languageCode: q.languageCode },
    });
    if (!existing) {
      await prisma.quiz.create({
        data: { ...q, options: JSON.stringify(q.options) },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log("✅ Seed complete: languages + plans + vocabulary/flashcards/quizzes + admin user (admin@linguaverse.ai / ChangeMe123!) + demo user (demo@linguaverse.ai / ChangeMe123!)");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
