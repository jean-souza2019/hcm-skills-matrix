import { useAuthBootstrap } from '@/hooks/useAuthBootstrap'
import { AppRouter } from '@/router/AppRouter'

function App() {
  useAuthBootstrap()
  return <AppRouter />
}

export default App
