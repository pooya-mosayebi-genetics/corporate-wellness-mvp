export type Language = 'en' | 'fa';

export interface TranslationStrings {
  // Tabs
  tabHome: string;
  tabTips: string;
  tabProfile: string;

  // Profile
  profileTitle: string;
  profileSubtitle: string;
  appearanceSettings: string;
  theme: string;
  adminDashboards: string;
  coachDashboard: string;
  coachDashboardDesc: string;
  hrDashboard: string;
  hrDashboardDesc: string;
  personalInfo: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  activityLevel: string;
  goal: string;
  dailyTargets: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  metabolicInfo: string;
  bmrLabel: string;
  tdeeLabel: string;
  editProfile: string;
  resetAllData: string;
  profileNotSetUp: string;
  setUpProfile: string;
  completeOnboardingMsg: string;
  corporateWellnessMember: string;

  // Tips
  tipsTitle: string;
  tipsSubtitle: string;
  allTips: string;
  showingTips: string;
  minRead: string;
  fromExpertTeam: string;
  newTipsWeekly: string;
  categoryOffice: string;
  categoryHydration: string;
  categoryMindfulness: string;
  categoryNutrition: string;
  categorySnacking: string;

  // Common
  welcome: string;
  goodMorning: string;
}

const en: TranslationStrings = {
  tabHome: 'Home',
  tabTips: 'Tips',
  tabProfile: 'Profile',

  profileTitle: 'Your Profile',
  profileSubtitle: 'Corporate Wellness Member',
  appearanceSettings: 'Appearance Settings',
  theme: 'Theme',
  adminDashboards: 'Admin Dashboards',
  coachDashboard: 'Coach Dashboard',
  coachDashboardDesc: 'Monitor team members and send nudges',
  hrDashboard: 'HR Dashboard',
  hrDashboardDesc: 'Aggregated wellness insights',
  personalInfo: 'Personal Information',
  age: 'Age',
  gender: 'Gender',
  weight: 'Weight',
  height: 'Height',
  activityLevel: 'Activity Level',
  goal: 'Goal',
  dailyTargets: 'Your Daily Targets',
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  metabolicInfo: 'Metabolic Info',
  bmrLabel: 'BMR (Base Metabolic Rate)',
  tdeeLabel: 'TDEE (Total Daily Energy)',
  editProfile: 'Edit Profile & Recalculate',
  resetAllData: 'Reset All Data',
  profileNotSetUp: 'Profile Not Set Up Yet',
  setUpProfile: 'Set Up Profile',
  completeOnboardingMsg: 'Complete the onboarding to see your personalized profile',
  corporateWellnessMember: 'Corporate Wellness Member',

  tipsTitle: 'Nutrition Tips 💡',
  tipsSubtitle: 'Expert advice from our wellness team',
  allTips: 'All Tips',
  showingTips: 'Showing',
  minRead: 'min read',
  fromExpertTeam: 'From our expert team',
  newTipsWeekly: '🌱 New tips are added weekly by our certified nutritionists. Check back often for fresh advice!',
  categoryOffice: 'At the Office',
  categoryHydration: 'Hydration',
  categoryMindfulness: 'Mindful Eating',
  categoryNutrition: 'Nutrition Basics',
  categorySnacking: 'Healthy Snacking',

  welcome: 'Welcome',
  goodMorning: 'Good Morning!',
};

const fa: TranslationStrings = {
  tabHome: 'خانه',
  tabTips: 'نکات',
  tabProfile: 'پروفایل',

  profileTitle: 'پروفایل شما',
  profileSubtitle: 'عضو برنامه سلامت سازمانی',
  appearanceSettings: 'تنظیمات ظاهری',
  theme: 'تم برنامه',
  adminDashboards: 'داشبوردهای مدیریتی',
  coachDashboard: 'داشبورد کوچ',
  coachDashboardDesc: 'پایش اعضای تیم و ارسال پیام انگیزشی',
  hrDashboard: 'داشبورد منابع انسانی',
  hrDashboardDesc: 'گزارش‌های تجمیعی سلامت',
  personalInfo: 'اطلاعات شخصی',
  age: 'سن',
  gender: 'جنسیت',
  weight: 'وزن',
  height: 'قد',
  activityLevel: 'سطح فعالیت',
  goal: 'هدف',
  dailyTargets: 'اهداف روزانه شما',
  calories: 'کالری',
  protein: 'پروتئین',
  carbs: 'کربوهیدرات',
  fat: 'چربی',
  metabolicInfo: 'اطلاعات متابولیک',
  bmrLabel: 'متابولیسم پایه (BMR)',
  tdeeLabel: 'انرژی کل روزانه (TDEE)',
  editProfile: 'ویرایش پروفایل و محاسبه مجدد',
  resetAllData: 'پاک کردن تمام داده‌ها',
  profileNotSetUp: 'پروفایل هنوز تنظیم نشده است',
  setUpProfile: 'تنظیم پروفایل',
  completeOnboardingMsg: 'برای مشاهده پروفایل شخصی‌سازی‌شده، مراحل ثبت‌نام را کامل کنید',
  corporateWellnessMember: 'عضو برنامه سلامت سازمانی',

  tipsTitle: 'نکات تغذیه 💡',
  tipsSubtitle: 'توصیه‌های تخصصی از تیم سلامت ما',
  allTips: 'همه نکات',
  showingTips: 'نمایش',
  minRead: 'دقیقه مطالعه',
  fromExpertTeam: 'از تیم متخصص ما',
  newTipsWeekly: '🌱 نکات جدید به صورت هفتگی توسط متخصصان تغذیه ما اضافه می‌شوند. برای دریافت توصیه‌های تازه، مرتب سر بزنید!',
  categoryOffice: 'در محل کار',
  categoryHydration: 'آبرسانی',
  categoryMindfulness: 'خوردن آگاهانه',
  categoryNutrition: 'اصول تغذیه',
  categorySnacking: 'میان‌وعده سالم',

  welcome: 'خوش آمدید',
  goodMorning: 'صبح بخیر!',
};

export const translations: Record<Language, TranslationStrings> = {
  en,
  fa,
};

export const languageLabels: Record<Language, string> = {
  en: '🇺🇸 English',
  fa: '🇮🇷 فارسی',
};