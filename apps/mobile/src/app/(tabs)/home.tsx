import { HomeContent } from '@/features/catalog/HomeContent';
import { useHome } from '@/features/catalog/api';

/** T05 Início. */
export default function HomeScreen() {
  const home = useHome();
  return (
    <HomeContent
      data={home.data}
      status={home.status}
      error={home.error}
      refreshing={home.isRefetching}
      onRefresh={() => void home.refetch()}
    />
  );
}
