import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth/store';

/** Entry URL: route to the tabs or the auth flow depending on the session. */
export default function Index() {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return <Redirect href={signedIn ? '/home' : '/welcome'} />;
}
