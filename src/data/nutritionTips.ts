import type { Language } from '../i18n/translations';

export type TipCategory =
  | 'office'
  | 'hydration'
  | 'mindfulness'
  | 'nutrition'
  | 'snacking';

export interface LocalizedText {
  en: string;
  fa: string;
}

export interface NutritionTip {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  category: TipCategory;
  icon: string;
  readTimeMinutes: number;
}

export const categoryColors: Record<TipCategory, string> = {
  office: '#1E3A8A',
  hydration: '#3B82F6',
  mindfulness: '#8B5CF6',
  nutrition: '#10B981',
  snacking: '#F59E0B',
};

export const nutritionTips: NutritionTip[] = [
  {
    id: '1',
    title: {
      en: 'How to Eat Healthy at the Office',
      fa: 'چگونه در محل کار سالم غذا بخوریم',
    },
    description: {
      en: 'Plan your meals the night before. Prepare a balanced lunch with lean protein, whole grains, and vegetables. Avoid the temptation of office vending machines by keeping healthy snacks at your desk.',
      fa: 'وعده‌های غذایی خود را از شب قبل برنامه‌ریزی کنید. ناهاری متعادل با پروتئین کم‌چرب، غلات کامل و سبزیجات آماده کنید. با نگهداری میان‌وعده‌های سالم روی میز، از وسوسه دستگاه‌های فروش خودداری کنید.',
    },
    category: 'office',
    icon: '🏢',
    readTimeMinutes: 3,
  },
  {
    id: '2',
    title: {
      en: 'The Power of Meal Prep Sundays',
      fa: 'قدرت آماده‌سازی غذا در یکشنبه‌ها',
    },
    description: {
      en: 'Dedicate 2 hours on Sunday to prepare meals for the week. Cook grains, chop vegetables, and portion proteins. This saves time and prevents unhealthy fast food choices during busy workdays.',
      fa: 'دو ساعت در روز یکشنبه را به آماده‌سازی وعده‌های هفته اختصاص دهید. غلات را بپزید، سبزیجات را خرد کنید و پروتئین‌ها را سهم‌بندی کنید. این کار زمان شما را ذخیره می‌کند و از انتخاب‌های ناسالم فست‌فود در روزهای شلوغ کاری جلوگیری می‌کند.',
    },
    category: 'office',
    icon: '🍱',
    readTimeMinutes: 4,
  },
  {
    id: '3',
    title: {
      en: 'Stay Hydrated Throughout the Day',
      fa: 'در طول روز هیدراته بمانید',
    },
    description: {
      en: 'Drink a glass of water first thing in the morning. Keep a water bottle visible on your desk. Aim for 8 glasses daily. Add lemon or cucumber slices for natural flavor without calories.',
      fa: 'اولین کار در صبح، یک لیوان آب بنوشید. بطری آب را در دید روی میز خود قرار دهید. هدف روزانه ۸ لیوان است. برای طعم طبیعی بدون کالری، برش‌های لیمو یا خیار اضافه کنید.',
    },
    category: 'hydration',
    icon: '💧',
    readTimeMinutes: 2,
  },
  {
    id: '4',
    title: {
      en: 'Hydration and Focus',
      fa: 'آبرسانی و تمرکز',
    },
    description: {
      en: 'Even mild dehydration can reduce concentration by up to 10%. Set hourly reminders to drink water. If you drink coffee, balance each cup with an extra glass of water.',
      fa: 'حتی کم‌آبی خفیف می‌تواند تمرکز را تا ۱۰ درصد کاهش دهد. یادآورهای ساعتی برای نوشیدن آب تنظیم کنید. اگر قهوه می‌نوشید، هر فنجان را با یک لیوان اضافی آب متعادل کنید.',
    },
    category: 'hydration',
    icon: '🧠',
    readTimeMinutes: 3,
  },
  {
    id: '5',
    title: {
      en: 'Practice Mindful Eating',
      fa: 'خوردن آگاهانه را تمرین کنید',
    },
    description: {
      en: 'Take 20 minutes for lunch away from your screen. Chew slowly and savor each bite. Put your fork down between bites. This improves digestion and prevents overeating.',
      fa: 'برای ناهار ۲۰ دقیقه دور از صفحه نمایش وقت بگذارید. آهسته بجوید و از هر لقمه لذت ببرید. بین لقمه‌ها قاشق خود را زمین بگذارید. این کار هضم را بهبود می‌بخشد و از پرخوری جلوگیری می‌کند.',
    },
    category: 'mindfulness',
    icon: '🧘',
    readTimeMinutes: 3,
  },
  {
    id: '6',
    title: {
      en: 'The 80/20 Rule for Wellness',
      fa: 'قانون ۸۰/۲۰ برای سلامتی',
    },
    description: {
      en: 'Aim to eat nutrient-dense foods 80% of the time, and enjoy your favorite treats 20% of the time. This balanced approach prevents burnout and supports long-term healthy habits.',
      fa: 'سعی کنید ۸۰ درصد مواقع غذاهای پر از مواد مغذی بخورید و ۲۰ درصد مواقع از خوراکی‌های مورد علاقه خود لذت ببرید. این رویکرد متعادل از خستگی جلوگیری می‌کند و عادات سالم بلندمدت را حمایت می‌کند.',
    },
    category: 'mindfulness',
    icon: '⚖️',
    readTimeMinutes: 2,
  },
  {
    id: '7',
    title: {
      en: 'Build a Balanced Plate',
      fa: 'یک بشقاب متعادل بسازید',
    },
    description: {
      en: 'Fill half your plate with vegetables, one quarter with lean protein, and one quarter with whole grains. Add a thumb-sized portion of healthy fats like olive oil or avocado.',
      fa: 'نصف بشقاب خود را با سبزیجات، یک چهارم را با پروتئین کم‌چرب و یک چهارم را با غلات کامل پر کنید. یک سهم به اندازه شست از چربی‌های سالم مانند روغن زیتون یا آووکادو اضافه کنید.',
    },
    category: 'nutrition',
    icon: '🍽️',
    readTimeMinutes: 3,
  },
  {
    id: '8',
    title: {
      en: 'Understanding Macronutrients',
      fa: 'درک ماکرومغذی‌ها',
    },
    description: {
      en: 'Protein builds and repairs tissue (4 cal/g). Carbohydrates provide quick energy (4 cal/g). Fats support hormone function (9 cal/g). Balance all three for sustained energy throughout the day.',
      fa: 'پروتئین بافت‌ها را می‌سازد و ترمیم می‌کند (۴ کالری/گرم). کربوهیدرات‌ها انرژی سریع فراهم می‌کنند (۴ کالری/گرم). چربی‌ها عملکرد هورمون‌ها را حمایت می‌کنند (۹ کالری/گرم). برای انرژی پایدار در طول روز، هر سه را متعادل کنید.',
    },
    category: 'nutrition',
    icon: '📊',
    readTimeMinutes: 4,
  },
  {
    id: '9',
    title: {
      en: 'Smart Office Snacking',
      fa: 'میان‌وعده هوشمند در محل کار',
    },
    description: {
      en: 'Replace chips and candy with nuts, Greek yogurt, or fresh fruit. Keep a small container of almonds at your desk. Pair protein with fiber for sustained energy: apple with peanut butter is perfect.',
      fa: 'چیپس و آبنبات را با آجیل، ماست یونانی یا میوه تازه جایگزین کنید. یک ظرف کوچک بادام روی میز خود داشته باشید. برای انرژی پایدار، پروتئین را با فیبر همراه کنید: سیب با کره بادام‌زمینی عالی است.',
    },
    category: 'snacking',
    icon: '🥜',
    readTimeMinutes: 2,
  },
  {
    id: '10',
    title: {
      en: 'Smart Coffee Choices',
      fa: 'انتخاب‌های هوشمندانه قهوه',
    },
    description: {
      en: 'Skip the sugar and cream in your coffee. Try cinnamon or a splash of milk instead. Limit caffeine after 2 PM to protect your sleep quality. Consider green tea as a gentler afternoon alternative.',
      fa: 'شکر و خامه را در قهوه خود حذف کنید. در عوض، دارچین یا کمی شیر امتحان کنید. برای محافظت از کیفیت خواب، کافئین را بعد از ساعت ۲ بعدازظهر محدود کنید. چای سبز را به عنوان جایگزین ملایم‌تر برای بعدازظهر در نظر بگیرید.',
    },
    category: 'snacking',
    icon: '☕',
    readTimeMinutes: 2,
  },
];