import { useEffect } from 'react';
import { Redirect } from 'expo-router';

export default function WeeklySummaryRedirect() {
  // صفحه حذف شد؛ همه چیز به Reports منتقل شده
  return <Redirect href="/reports" />;
}