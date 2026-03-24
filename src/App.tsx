import { ThemeProvider } from '@/context/ThemeContext';
import { Layout } from '@/components/layout/Layout';
import { Overview } from '@/pages/Overview';

export default function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Overview />
      </Layout>
    </ThemeProvider>
  );
}
