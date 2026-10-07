import type { ContentPost } from '../types/content';

/** رسپی‌های اولیهٔ سامانه (ماکروها از دیتابیس غذای ایرانی) */
export const seedPosts: ContentPost[] = [
  {
    id: 'seed-recipe-1',
    kind: 'recipe',
    category: 'nutrition',
    titleFa: 'ناهار سبک اداری: عدس پلو + ماست',
    titleEn: 'Light office lunch: Lentil rice + yogurt',
    bodyFa:
      'یک بشقاب عدس پلو با یک پیمانه ماست و خیار، ترکیبی متعادل از پروتئین گیاهی و فیبر است که انرژی پایدار تا پایان روز کاری می‌دهد.',
    bodyEn:
      'A plate of lentil rice with a cup of yogurt and cucumber gives balanced plant protein and fiber for steady energy through the workday.',
    recipe: [
      { foodId: 'seed-adas-polo', nameFa: 'عدس پلو', nameEn: 'Lentil rice', portionFa: '۱ بشقاب', portionEn: '1 plate', qty: 1, kcal: 420, protein: 14, carbs: 74, fat: 8 },
      { foodId: 'seed-mast', nameFa: 'ماست', nameEn: 'Yogurt', portionFa: '۱ پیمانه', portionEn: '1 cup', qty: 1, kcal: 100, protein: 8, carbs: 8, fat: 4 },
      { foodId: 'seed-khiar', nameFa: 'خیار', nameEn: 'Cucumber', portionFa: '۱ عدد', portionEn: '1 pc', qty: 1, kcal: 16, protein: 0.7, carbs: 3.6, fat: 0.1 },
    ],
    author: 'system',
    publishedAt: '2026-09-01',
    source: 'system',
  },
  {
    id: 'seed-recipe-2',
    kind: 'recipe',
    category: 'sobhani',
    titleFa: 'صبحانهٔ پروتئینی: نیمرو + نان سنگک',
    titleEn: 'Protein breakfast: Omelet + Sangak',
    bodyFa:
      'شروع روز با پروتئین کافی، گرسنگی زودرس و ریزه‌خواری عصر را کاهش می‌دهد. گوجه و خیار کنار بشقاب، حجم و ریزمغذی اضافه می‌کند بدون کالری زیاد.',
    bodyEn:
      'Starting the day with enough protein reduces mid-morning hunger and snacking. Tomato and cucumber add volume and micronutrients without many calories.',
    recipe: [
      { foodId: 'seed-tokhme-morgh', nameFa: 'تخم‌مرغ', nameEn: 'Egg', portionFa: '۱ عدد', portionEn: '1 pc', qty: 2, kcal: 78, protein: 6, carbs: 0.6, fat: 5 },
      { foodId: 'seed-nan-sangak', nameFa: 'نان سنگک', nameEn: 'Sangak bread', portionFa: '۱ کف دست', portionEn: '1 piece', qty: 1, kcal: 160, protein: 5, carbs: 32, fat: 1 },
      { foodId: 'seed-gojeh', nameFa: 'گوجه فرنگی', nameEn: 'Tomato', portionFa: '۱ عدد', portionEn: '1 pc', qty: 1, kcal: 22, protein: 1, carbs: 4.8, fat: 0.2 },
    ],
    author: 'system',
    publishedAt: '2026-09-03',
    source: 'system',
  },
  {
    id: 'seed-recipe-3',
    kind: 'recipe',
    category: 'snacking',
    titleFa: 'میان‌وعدهٔ هوشمند: ماست + گردو + سیب',
    titleEn: 'Smart snack: Yogurt + walnut + apple',
    bodyFa:
      'ترکیب پروتئین ماست با چربی سالم گردو و فیبر سیب، قند خون را ثابت نگه می‌دارد و جلوی پیک انرژی عصر را می‌گیرد.',
    bodyEn:
      'Combining yogurt protein with walnut healthy fats and apple fiber keeps blood sugar steady and prevents the afternoon energy crash.',
    recipe: [
      { foodId: 'seed-mast', nameFa: 'ماست', nameEn: 'Yogurt', portionFa: '۱ پیمانه', portionEn: '1 cup', qty: 1, kcal: 100, protein: 8, carbs: 8, fat: 4 },
      { foodId: 'seed-gerdoo', nameFa: 'گردو', nameEn: 'Walnut', portionFa: '۱۵ گرم', portionEn: '15g', qty: 1, kcal: 98, protein: 2, carbs: 2, fat: 10 },
      { foodId: 'seed-sib', nameFa: 'سیب', nameEn: 'Apple', portionFa: '۱ متوسط', portionEn: '1 medium', qty: 1, kcal: 80, protein: 0.4, carbs: 21, fat: 0.3 },
    ],
    author: 'system',
    publishedAt: '2026-09-05',
    source: 'system',
  },
  {
    id: 'seed-tip-1',
    kind: 'tip',
    category: 'hydration',
    titleFa: 'قبل از هر وعدهٔ اداری، یک لیوان آب',
    titleEn: 'A glass of water before every office meal',
    bodyFa:
      'نوشیدن یک لیوان آب ۱۰ دقیقه قبل از وعده، اشتهای کاذب ناشی از خستگی را کاهش می‌دهد و معمولاً ۱۰۰ تا ۲۰۰ کالری از وعده را کم می‌کند.',
    bodyEn:
      'Drinking a glass of water 10 minutes before a meal reduces fatigue-driven false appetite and typically cuts 100-200 kcal from the meal.',
    author: 'system',
    publishedAt: '2026-09-07',
    source: 'system',
  },
];