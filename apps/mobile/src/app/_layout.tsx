import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useScreenAnimation } from '@/hooks/useScreenAnimation';
import { authStore, useAuth } from '@/lib/auth/store';
import { color, interFamilies } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [interFamilies['400']]: Inter_400Regular,
    [interFamilies['500']]: Inter_500Medium,
    [interFamilies['600']]: Inter_600SemiBold,
  });
  const status = useAuth((s) => s.status);
  const fadeThrough = useScreenAnimation('fade');

  useEffect(() => {
    void authStore.getState().bootstrap();
  }, []);

  const ready = (fontsLoaded || fontError) && status !== 'bootstrapping';
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Keep the splash screen until fonts and the stored session are resolved.
  if (!ready) return null;

  const signedIn = status === 'signedIn';
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.bg.base },
          ...fadeThrough,
        }}
      >
        <Stack.Screen name="index" />
        {/* Route guards: signed-out users only reach (auth); signed-in users only reach (tabs). */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
