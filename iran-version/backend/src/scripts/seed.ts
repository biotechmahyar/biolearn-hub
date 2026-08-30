/**
 * Development seed script — populates the database with sample data.
 * Run with: npx tsx src/scripts/seed.ts
 *
 * ⚠️  NEVER run this in production.
 * ⚠️  Contains no real secrets, API keys, or tokens.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashSync } from "bcryptjs";
import {
  users,
  categories,
  instructors,
  courses,
  articles,
  questions,
  exams,
  testimonials,
  admins,
} from "../db/schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://nibrc:nibrc_secret@localhost:5432/nibrc";

async function seed() {
  console.log("🌱 Seeding NIBRC database…");
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  // ── Users ──────────────────────────────────────────────────────────
  const passwordHash = hashSync("Admin@123", 12);

  const [adminUser] = await db
    .insert(users)
    .values({
      name: "مدیر سامانه",
      email: "admin@nibrc.ir",
      passwordHash,
      role: "admin",
      emailVerificationTime: Date.now(),
    })
    .returning();
  console.log(`  ✓ Admin user: ${adminUser.email} (${adminUser.id})`);

  // Also insert into admins table so the email-based guard works
  await db.insert(admins).values({ email: "admin@nibrc.ir" });

  const [siteAdminUser] = await db
    .insert(users)
    .values({
      name: "مدیر سایت",
      email: "manager@nibrc.ir",
      passwordHash,
      role: "site_admin",
      emailVerificationTime: Date.now(),
    })
    .returning();
  console.log(`  ✓ Site Admin: ${siteAdminUser.email} (${siteAdminUser.id})`);

  const [instructorUser] = await db
    .insert(users)
    .values({
      name: "دکتر رضا محمدی",
      email: "instructor@nibrc.ir",
      passwordHash,
      role: "instructor",
      university: "دانشگاه تهران",
      major: "میکروبیولوژی",
      emailVerificationTime: Date.now(),
    })
    .returning();
  console.log(`  ✓ Instructor: ${instructorUser.email} (${instructorUser.id})`);

  const [studentUser] = await db
    .insert(users)
    .values({
      name: "سارا احمدی",
      email: "student@nibrc.ir",
      passwordHash,
      role: "user",
      university: "دانشگاه شهید بهشتی",
      major: "زیست‌شناسی سلولی و مولکولی",
      emailVerificationTime: Date.now(),
    })
    .returning();
  console.log(`  ✓ Student: ${studentUser.email} (${studentUser.id})`);

  // ── Categories ─────────────────────────────────────────────────────
  const categoryData = [
    { name: "میکروبیولوژی", slug: "microbiology", description: "مطالعه ارگانیسم‌های ریز", icon: "Microscope", accent: "teal", order: 1 },
    { name: "ژنتیک", slug: "genetics", description: "علم وراثت و ژن‌ها", icon: "Dna", accent: "emerald", order: 2 },
    { name: "بیوشیمی", slug: "biochemistry", description: "شیمی موجودات زنده", icon: "FlaskConical", accent: "sky", order: 3 },
    { name: "فیزیولوژی", slug: "physiology", description: "عملکرد اعضای بدن", icon: "Heart", accent: "rose", order: 4 },
    { name: "ایمونولوژی", slug: "immunology", description: "سیستم ایمنی بدن", icon: "Shield", accent: "violet", order: 5 },
    { name: "اکولوژی", slug: "ecology", description: "رابطه موجودات با محیط", icon: "TreePine", accent: "amber", order: 6 },
  ];
  const insertedCategories = await db.insert(categories).values(categoryData).returning();
  console.log(`  ✓ ${insertedCategories.length} categories`);

  // ── Instructors ────────────────────────────────────────────────────
  const instructorData = [
    {
      name: "دکتر رضا محمدی",
      slug: "reza-mohammadi",
      title: "دانشیار میکروبیولوژی دانشگاه تهران",
      bio: "دکتر رضا محمدی با بیش از ۱۵ سال سابقه تدریس و تحقیق در حوزه میکروبیولوژی و بیوتکنولوژی فعالیت می‌کند.",
      education: ["دکترای میکروبیولوژی - دانشگاه تهران", "کارشناسی ارشد زیست‌شناسی - دانشگاه شیراز"],
      specialties: ["میکروبیولوژی پزشکی", "بیوتکنولوژی", "ژنتیک باکتریایی"],
      accent: "teal",
      verified: true,
      userId: instructorUser.id,
    },
  ];
  const [insertedInstructor] = await db.insert(instructors).values(instructorData).returning();
  console.log(`  ✓ Instructor profile: ${insertedInstructor.name}`);

  // ── Courses ────────────────────────────────────────────────────────
  const courseData = [
    {
      title: "میکروبیولوژی پیشرفته",
      slug: "advanced-microbiology",
      categoryId: insertedCategories[0].id,
      instructorId: insertedInstructor.id,
      summary: "دوره جامع میکروبیولوژی پزشکی از مبانی تا پیشرفته",
      description: "<p>این دوره شامل مباحث پیشرفته میکروبیولوژی پزشکی است.</p>",
      audience: ["دانشجویان کارشناسی ارشد میکروبیولوژی", "پزشکان عمومی"],
      prerequisites: ["آشنایی با زیست‌شناسی پایه"],
      syllabus: [
        { id: "s1", title: "مقدمه بر میکروبیولوژی", durationMin: 60, free: true },
        { id: "s2", title: "باکتری‌شناسی", durationMin: 90, free: false },
        { id: "s3", title: "ویروس‌شناسی", durationMin: 90, free: false },
      ],
      durationText: "۱۲ ساعت",
      mode: "live",
      price: 2500000,
      rating: 4.8,
      ratingCount: 45,
      studentsCount: 120,
      accent: "teal",
      bundle: "basic",
      includes: ["ویدئوهای ضبط‌شده", "فایل‌های PDF", "آزمون آنلاین"],
      hasSampleVideo: true,
      files: [],
      published: true,
      featured: true,
      popular: true,
      createdAt: Date.now(),
    },
    {
      title: "ژنتیک مولکولی",
      slug: "molecular-genetics",
      categoryId: insertedCategories[1].id,
      instructorId: insertedInstructor.id,
      summary: "آشنایی با مکانیزم‌های مولکولی وراثت",
      description: "<p>دوره ژنتیک مولکولی با رویکرد کاربردی</p>",
      audience: ["دانشجویان زیست‌شناسی"],
      prerequisites: ["زیست‌شناسی پایه"],
      syllabus: [
        { id: "g1", title: "ساختار DNA", durationMin: 75, free: true },
        { id: "g2", title: "همانندسازی DNA", durationMin: 80, free: false },
      ],
      durationText: "۸ ساعت",
      mode: "recorded",
      price: 1800000,
      rating: 4.6,
      ratingCount: 30,
      studentsCount: 85,
      accent: "emerald",
      bundle: "basic",
      includes: ["ویدئو", "تمرین"],
      hasSampleVideo: false,
      files: [],
      published: true,
      featured: true,
      popular: false,
      createdAt: Date.now(),
    },
  ];
  const insertedCourses = await db.insert(courses).values(courseData).returning();
  console.log(`  ✓ ${insertedCourses.length} courses`);

  // ── Questions ──────────────────────────────────────────────────────
  const questionData = [
    {
      text: "کدام یک از موارد زیر خصوصیات باکتری‌هاست؟",
      options: ["دارای هسته واقعی", "تک‌سلولی با DNA حلقوی", "چندسلولی", "دارای میتوکندری"],
      correctIndex: 1,
      explanation: "باکتری‌ها تک‌سلولی هستند و DNA حلقوی دارند بدون هسته واقعی.",
      topicId: insertedCategories[0].id,
      difficulty: 1,
    },
    {
      text: "فرآیند همانندسازی DNA در کدام فاز سلول اتفاق می‌افتد؟",
      options: ["فاز G1", "فاز S", "فاز G2", "فاز M"],
      correctIndex: 1,
      explanation: "همانندسازی DNA در فاز S (Synthesis) اتفاق می‌افتد.",
      topicId: insertedCategories[1].id,
      difficulty: 2,
    },
    {
      text: "آنزیم DNA پلیمراز III در کدام موجود نقش اصلی همانندسازی DNA را ایفا می‌کند؟",
      options: ["ویروس", "باکتری E. coli", "قارچ", "گیاه"],
      correctIndex: 1,
      explanation: "DNA پلیمراز III آنزیم اصلی همانندسازی DNA در E. coli است.",
      topicId: insertedCategories[1].id,
      difficulty: 2,
    },
  ];
  const insertedQuestions = await db.insert(questions).values(questionData).returning();
  console.log(`  ✓ ${insertedQuestions.length} questions`);

  // ── Exams ──────────────────────────────────────────────────────────
  const examData = [
    {
      title: "آزمون تعیین سطح میکروبیولوژی",
      slug: "microbiology-placement",
      description: "این آزمون سطح دانش شما در میکروبیولوژی را تعیین می‌کند.",
      durationMinutes: 30,
      questionIds: [insertedQuestions[0].id],
      free: true,
      published: true,
      featured: true,
      diagnostic: true,
      accent: "teal",
      order: 1,
    },
    {
      title: "آزمون تعیین سطح ژنتیک",
      slug: "genetics-placement",
      description: "آزمون سنجش دانش ژنتیک شما",
      durationMinutes: 25,
      questionIds: [insertedQuestions[1].id, insertedQuestions[2].id],
      free: true,
      published: true,
      featured: false,
      diagnostic: true,
      accent: "emerald",
      order: 2,
    },
  ];
  await db.insert(exams).values(examData);
  console.log(`  ✓ ${examData.length} exams`);

  // ── Articles ───────────────────────────────────────────────────────
  const articleData = [
    {
      title: "مقدمه‌ای بر میکروبیولوژی",
      slug: "intro-to-microbiology",
      subtitle: "با دنیای شگفت‌انگیز میکروب‌ها آشنا شوید",
      category: "میکروبیولوژی",
      excerpt: "میکروبیولوژی علم مطالعه موجودات ریز است که نقش حیاتی در طبیعت و پزشکی دارند.",
      body: "<h2>میکروبیولوژی چیست؟</h2><p>میکروبیولوژی علم مطالعه موجودات ریز از جمله باکتری‌ها، ویروس‌ها، قارچ‌ها و تک‌یاخته‌هاست.</p>",
      authorName: "دکتر رضا محمدی",
      authorId: instructorUser.id,
      accent: "teal",
      readTime: 8,
      level: "beginner",
      status: "published",
      published: true,
      featured: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      title: "ساختار DNA و اهمیت آن",
      slug: "dna-structure",
      subtitle: "بررسی مولکول حامل اطلاعات ژنتیکی",
      category: "ژنتیک",
      excerpt: "DNA مولکول حامل اطلاعات ژنتیکی تمام موجودات زنده است.",
      body: "<h2>ساختار مارپیچی DNA</h2><p>دی‌اکسی‌ریبونوکلئیک اسید یا DNA مولکولی دومارپیچی است که اطلاعات ژنتیکی را ذخیره می‌کند.</p>",
      authorName: "تیم آموزشی NIBRC",
      accent: "emerald",
      readTime: 10,
      level: "intermediate",
      status: "published",
      published: true,
      featured: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  await db.insert(articles).values(articleData);
  console.log(`  ✓ ${articleData.length} articles`);

  // ── Testimonials ───────────────────────────────────────────────────
  const testimonialData = [
    { name: "علی رضایی", role: "دانشجوی کارشناسی ارشد", text: "محتوای سایت بسیار عالی و کاربردی است.", rating: 5, course: "میکروبیولوژی پیشرفته", accent: "teal" },
    { name: "مریم حسینی", role: "فارغ‌التحصیل کارشناسی", text: "آزمون‌های تعیین سطح واقعاً مفید هستند.", rating: 4, course: "ژنتیک مولکولی", accent: "emerald" },
  ];
  await db.insert(testimonials).values(testimonialData);
  console.log(`  ✓ ${testimonialData.length} testimonials`);

  console.log("\n✅ Seed completed successfully!");
  console.log("   Test accounts:");
  console.log("   - admin@nibrc.ir / Admin@123 (مدیر سامانه)");
  console.log("   - manager@nibrc.ir / Admin@123 (مدیر سایت)");
  console.log("   - instructor@nibrc.ir / Admin@123 (استاد)");
  console.log("   - student@nibrc.ir / Admin@123 (دانشجو)");

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
