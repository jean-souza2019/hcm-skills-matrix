import { createApp } from './app';
import { runtimeEnv } from './config/env';

const app = createApp();

const port = runtimeEnv.PORT;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${port}`);
});
