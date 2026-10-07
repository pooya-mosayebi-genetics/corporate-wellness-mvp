import { useMemo, useState, useEffect, useRef } from 'react';
import { Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useAuth } from '../src/store/AuthContext';
import { BRAND } from '../src/config/brand';
import BrandLogo from '../src/components/ui/BrandLogo';
import Icon from '../src/components/ui/Icon';
import { normalizeNationalId } from '../src/utils/nationalId';
import { validatePasswordStrength } from '../src/utils/security';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { 
    step, 
    isBootstrap, // 🆕 نمایش حالت Bootstrap
    submitCode, 
    submitPassword, 
    completeSetup,
    isLoading, 
    error, 
    clearError,
    resetFlow 
  } = useAuth();
  const isFa = language === 'fa';

  const [codeInput, setCodeInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  const passRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Auto-focus logic
  useEffect(() => {
    if (step === 'password') {
      setTimeout(() => passRef.current?.focus(), 100);
    } else if (step === 'setup') {
      setTimeout(() => passRef.current?.focus(), 100);
    }
  }, [step]);

  const codeValid = useMemo(() => normalizeNationalId(codeInput).length === 10, [codeInput]);
  
  // Live Password Validation for Setup Step
  const passValidation = useMemo(() => validatePasswordStrength(passInput), [passInput]);
  const passwordsMatch = passInput === confirmInput;
  const setupReady = passValidation.valid && passwordsMatch;

  const inputStyle = { 
    backgroundColor: colors.surfaceAlt, 
    borderColor: colors.border, 
    color: colors.text, 
    borderWidth: 1, 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    fontSize: 14 
  };

  const handleCodeSubmit = async () => {
    if (!codeValid || isLoading) return;
    await submitCode(codeInput);
  };

  const handlePassSubmit = async () => {
    if (!passInput || isLoading) return;
    await submitPassword(passInput);
  };

  const handleSetupSubmit = async () => {
    if (!setupReady || isLoading) return;
    const success = await completeSetup(passInput);
    if (success) {
      // Success handled by Context (redirects to dashboard)
    }
  };

  const goBackToCode = () => {
    resetFlow();
    setPassInput('');
    setConfirmInput(' ');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 420 }}>
          
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{isFa ? 'سامانه سلامت سازمانی' : 'Corporate Wellness System'}</Text>
            <Pressable onPress={() => setLanguage(language === 'fa' ? 'en' : 'fa')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'EN' : 'فا'}</Text>
            </Pressable>
          </View>

          <View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
            
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <BrandLogo size={64} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12 }}>{BRAND.title}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                {step === 'code' ? (isFa ? 'ورود کارکنان' : 'Staff Login') : 
                 step === 'password' ? (isFa ? 'تأیید هویت' : 'Verify Identity') : 
                 isBootstrap ? (isFa ? '🎉 اولین کاربر - ایجاد حساب مدیر' : '🎉 First User - Create Admin Account') :
                 (isFa ? 'تنظیم رمز عبور' : 'Set Password')}
              </Text>
            </View>

            {/* STEP 1: NATIONAL ID */}
            {step === 'code' && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>{isFa ? 'کد ملی ۱۰ رقمی' : '10-Digit National ID'}</Text>
                <TextInput 
                  style={[inputStyle, { textAlign: 'center', letterSpacing: 3, fontSize: 16, fontWeight: '700' }]} 
                  keyboardType="number-pad" 
                  placeholder="REDACTED_ID" 
                  placeholderTextColor={colors.textMuted} 
                  value={codeInput} 
                  onChangeText={(t) => {
                    setCodeInput(normalizeNationalId(t));
                    if (error) clearError();
                  }} 
                  onSubmitEditing={handleCodeSubmit}
                  blurOnSubmit={false}
                  maxLength={10}
                  editable={!isLoading}
                />
                
                <Pressable 
                  onPress={handleCodeSubmit} 
                  disabled={!codeValid || isLoading} 
                  style={{ 
                    borderRadius: 12, 
                    paddingVertical: 14, 
                    alignItems: 'center', 
                    marginTop: 16,
                    backgroundColor: codeValid && !isLoading ? colors.primary : colors.border,
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? 'ادامه' : 'Continue'}</Text>
                  )}
                </Pressable>
              </>
            )}

            {/* STEP 2: PASSWORD (Existing User) */}
            {step === 'password' && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>{isFa ? 'رمز عبور' : 'Password'}</Text>
                  <Pressable onPress={goBackToCode}>
                    <Text style={{ fontSize: 10, color: colors.primary }}>{isFa ? 'ویرایش کد' : 'Edit ID'}</Text>
                  </Pressable>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                  <TextInput 
                    ref={passRef}
                    style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text }} 
                    secureTextEntry={!showPass} 
                    placeholder={isFa ? 'رمز عبور خود را وارد کنید' : 'Enter your password'} 
                    placeholderTextColor={colors.textMuted} 
                    value={passInput} 
                    onChangeText={(t) => {
                      setPassInput(t);
                      if (error) clearError();
                    }} 
                    onSubmitEditing={handlePassSubmit}
                    blurOnSubmit={false}
                    editable={!isLoading}
                  />
                  <Pressable onPress={() => setShowPass(!showPass)} style={{ paddingHorizontal: 12, height: '100%', justifyContent: 'center' }}>
                    <Icon name={showPass ? 'eyeOff' : 'eye'} size={16} color={colors.textMuted} />
                  </Pressable>
                </View>

                <Pressable 
                  onPress={handlePassSubmit} 
                  disabled={!passInput || isLoading} 
                  style={{ 
                    borderRadius: 12, 
                    paddingVertical: 14, 
                    alignItems: 'center', 
                    marginTop: 16,
                    backgroundColor: passInput && !isLoading ? colors.primary : colors.border,
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? 'ورود نهایی' : 'Sign In'}</Text>
                  )}
                </Pressable>
              </>
            )}

            {/* STEP 3: SETUP NEW PASSWORD (Bootstrap or Reset) */}
            {step === 'setup' && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textAlign: 'center' }}>
                  {isBootstrap
                    ? (isFa ? 'به‌عنوان اولین کاربر، شما مدیر سامانه خواهید شد' : 'As the first user, you will become the system administrator')
                    : (isFa ? 'یک رمز قوی برای ورود تعیین کنید' : 'Create a strong password')
                  }
                </Text>
                
                {/* Password Field */}
                <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 8 }}>
                  <TextInput 
                    ref={passRef}
                    style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text }} 
                    secureTextEntry={!showPass} 
                    placeholder={isFa ? 'رمز جدید' : 'New Password'} 
                    placeholderTextColor={colors.textMuted} 
                    value={passInput} 
                    onChangeText={setPassInput} 
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <Pressable onPress={() => setShowPass(!showPass)} style={{ paddingHorizontal: 12, height: '100%', justifyContent: 'center' }}>
                    <Icon name={showPass ? 'eyeOff' : 'eye'} size={16} color={colors.textMuted} />
                  </Pressable>
                </View>

                {/* Confirm Password Field */}
                <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 12 }}>
                  <TextInput 
                    ref={confirmRef}
                    style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text }} 
                    secureTextEntry={!showPass} 
                    placeholder={isFa ? 'تکرار رمز' : 'Confirm Password'} 
                    placeholderTextColor={colors.textMuted} 
                    value={confirmInput} 
                    onChangeText={setConfirmInput} 
                    onSubmitEditing={handleSetupSubmit}
                    blurOnSubmit={false}
                  />
                </View>

                {/* Strength Indicators */}
                <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                    {isFa ? 'شرایط رمز:' : 'Requirements:'}
                  </Text>
                  {[
                    { ok: passInput.length >= 8, label: isFa ? 'حداقل ۸ کاراکتر' : 'Min 8 chars' },
                    { ok: /[A-Z]/.test(passInput), label: isFa ? 'یک حرف بزرگ' : 'One Uppercase' },
                    { ok: /[a-z]/.test(passInput), label: isFa ? 'یک حرف کوچک' : 'One Lowercase' },
                    { ok: /\d/.test(passInput), label: isFa ? 'یک عدد' : 'One Digit' },
                    { ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passInput), label: isFa ? 'یک کاراکتر خاص' : 'One Special Char' },
                    { ok: passwordsMatch && passInput.length > 0, label: isFa ? 'رمزها مطابقت دارند' : 'Passwords Match' },
                  ].map((r, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontSize: 10, marginRight: 4, color: r.ok ? colors.success : colors.textMuted }}>
                        {r.ok ? '✓' : '○'}
                      </Text>
                      <Text style={{ fontSize: 10, color: r.ok ? colors.success : colors.textMuted }}>
                        {r.label}
                      </Text>
                    </View>
                  ))}
                </View>

                <Pressable 
                  onPress={handleSetupSubmit} 
                  disabled={!setupReady || isLoading} 
                  style={{ 
                    borderRadius: 12, 
                    paddingVertical: 14, 
                    alignItems: 'center', 
                    backgroundColor: setupReady && !isLoading ? colors.primary : colors.border,
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{isFa ? 'ثبت و ورود' : 'Save & Sign In'}</Text>
                  )}
                </Pressable>
                
                <Pressable onPress={goBackToCode} style={{ paddingVertical: 6, alignItems: 'center', marginTop: 10 }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>{isFa ? 'بازگشت' : 'Back'}</Text>
                </Pressable>
              </>
            )}

            {/* ERROR MESSAGE */}
            {error && (
              <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 12, padding: 12, marginTop: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.danger }}>
                <Icon name="alertCircle" size={16} color={colors.danger} style={{ marginBottom: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.danger, textAlign: 'center', lineHeight: 16 }}>
                  {error}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center', marginTop: 16 }}>
            {isFa ? 'تمامی فعالیت‌ها ممیزی می‌شوند.' : 'All activities are audited.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
